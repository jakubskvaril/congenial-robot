'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { Navbar } from '@/components/marketing/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SUBSCRIPTION_PLANS } from '@/lib/constants';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-noise">
      <Navbar />
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight">Simple, credit-based pricing</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Every plan includes the full 5-agent pipeline. Credits are spent only on final video
            generation — analysis, layout, and prompt preview are always free.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <Card key={plan.tier} className={plan.tier === 'PRO' ? 'border-primary shadow-lg shadow-primary/10' : ''}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-semibold">${plan.priceMonthly}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.creditsPerMonth} credits / month</p>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={plan.tier === 'PRO' ? 'default' : 'outline'} asChild>
                  <Link href="/sign-up">{plan.tier === 'FREE' ? 'Start free' : 'Choose plan'}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
