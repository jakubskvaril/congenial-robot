import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/trpc';
import { db } from '@/server/db';
import { stripe } from '@/server/billing/stripe';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

export const billingRouter = router({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    return db.subscription.findFirst({
      where: { userId: ctx.user.id, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } },
      orderBy: { createdAt: 'desc' },
    });
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ tier: z.enum(['STARTER', 'PRO', 'STUDIO']) }))
    .mutation(async ({ ctx, input }) => {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === input.tier);
      if (!plan?.stripePriceEnvVar) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid plan' });
      const priceId = process.env[plan.stripePriceEnvVar];
      if (!priceId) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Plan not configured' });

      let stripeCustomerId = ctx.user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: ctx.user.email,
          metadata: { userId: ctx.user.id },
        });
        stripeCustomerId = customer.id;
        await db.user.update({ where: { id: ctx.user.id }, data: { stripeCustomerId } });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?checkout=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?checkout=canceled`,
        metadata: { userId: ctx.user.id, tier: input.tier },
      });

      return { checkoutUrl: session.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user.stripeCustomerId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'No billing account yet' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });
    return { portalUrl: session.url };
  }),
});
