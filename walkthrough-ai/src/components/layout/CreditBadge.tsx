'use client';

import Link from 'next/link';
import { Coins } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { formatCredits } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function CreditBadge() {
  const { data, isLoading } = trpc.credit.balance.useQuery();

  if (isLoading) return <Skeleton className="h-8 w-24 rounded-full" />;

  return (
    <Link
      href="/dashboard/billing"
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
    >
      <Coins className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium">{formatCredits(data?.balance ?? 0)}</span>
      <span className="text-muted-foreground">credits</span>
    </Link>
  );
}
