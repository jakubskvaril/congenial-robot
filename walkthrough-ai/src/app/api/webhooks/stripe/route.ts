import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/server/billing/stripe';
import { db } from '@/server/db';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

function tierFromPriceId(priceId: string) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.stripePriceEnvVar && process.env[p.stripePriceEnvVar] === priceId);
  return plan?.tier ?? 'STARTER';
}

async function grantMonthlyCredits(userId: string, tier: (typeof SUBSCRIPTION_PLANS)[number]['tier']) {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
  if (!plan) return;
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const balanceAfter = user.creditBalance + plan.creditsPerMonth;
    await tx.user.update({ where: { id: userId }, data: { creditBalance: balanceAfter } });
    await tx.creditLedgerEntry.create({
      data: { userId, amount: plan.creditsPerMonth, reason: 'SUBSCRIPTION_GRANT', balanceAfter, metadata: { tier } },
    });
  });
}

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id ?? '';
      const tier = tierFromPriceId(priceId);

      await db.subscription.create({
        data: {
          userId,
          tier,
          status: 'ACTIVE',
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
      await grantMonthlyCredits(userId, tier);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason !== 'subscription_cycle' || !invoice.subscription) break;

      const dbSubscription = await db.subscription.findUnique({
        where: { stripeSubscriptionId: invoice.subscription as string },
      });
      if (dbSubscription?.userId) {
        await grantMonthlyCredits(dbSubscription.userId, dbSubscription.tier);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status === 'active' ? 'ACTIVE'
            : subscription.status === 'past_due' ? 'PAST_DUE'
            : subscription.status === 'trialing' ? 'TRIALING'
            : subscription.status === 'canceled' ? 'CANCELED'
            : 'INCOMPLETE',
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await db.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'CANCELED' },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
