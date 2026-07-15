'use client';

import { UserButton } from '@clerk/nextjs';
import { CreditBadge } from './CreditBadge';

export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/5 px-6">
      <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-4">
        <CreditBadge />
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
