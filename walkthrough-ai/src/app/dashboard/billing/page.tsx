'use client';

import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';
import { formatCredits } from '@/lib/utils';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

export default function BillingPage() {
  const { data: balance } = trpc.credit.balance.useQuery();
  const { data: subscription } = trpc.billing.getSubscription.useQuery();
  const { data: ledger } = trpc.credit.ledger.useQuery({ limit: 15 });

  const checkout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
    onError: (err) => toast.error(err.message),
  });

  const portal = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.portalUrl) window.location.href = data.portalUrl;
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <Topbar title="Billing & credits" />
      <div className="mx-auto max-w-5xl space-y-10 p-6">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Current balance</p>
              <p className="font-display text-3xl font-semibold">{formatCredits(balance?.balance ?? 0)} credits</p>
              {subscription && (
                <Badge variant="secondary" className="mt-2">{subscription.tier} plan</Badge>
              )}
            </div>
            {subscription && (
              <Button variant="outline" onClick={() => portal.mutate()} disabled={portal.isPending}>
                Manage billing
              </Button>
            )}
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-4 font-display text-lg font-semibold">Plans</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isCurrent = subscription?.tier === plan.tier;
              return (
                <Card key={plan.tier} className={isCurrent ? 'border-primary' : ''}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="font-display text-2xl font-semibold">${plan.priceMonthly}</span>
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.creditsPerMonth} credits</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="mb-4 space-y-1.5 text-xs text-muted-foreground">
                      {plan.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex items-start gap-1.5">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" /> {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={isCurrent ? 'secondary' : 'outline'}
                      disabled={isCurrent || plan.tier === 'FREE' || checkout.isPending}
                      onClick={() => plan.tier !== 'FREE' && checkout.mutate({ tier: plan.tier as 'STARTER' | 'PRO' | 'STUDIO' })}
                    >
                      {isCurrent ? 'Current plan' : plan.tier === 'FREE' ? 'Included' : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-display text-lg font-semibold">Credit history</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="divide-y divide-white/5">
                {ledger?.entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">{entry.reason.replaceAll('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                    </div>
                    <span className={entry.amount >= 0 ? 'text-emerald-400' : 'text-muted-foreground'}>
                      {entry.amount >= 0 ? '+' : ''}{entry.amount}
                    </span>
                  </div>
                ))}
                {ledger?.entries.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No credit activity yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
