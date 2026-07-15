'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Film, LayoutGrid, Clapperboard, CreditCard, Settings, ShieldCheck } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

const NAV = [
  { href: '/dashboard', label: 'Projects', icon: LayoutGrid },
  { href: '/dashboard/videos', label: 'Video history', icon: Clapperboard },
  { href: '/dashboard/billing', label: 'Billing & credits', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === 'ADMIN';

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-card/40 md:flex">
      <div className="flex h-16 items-center gap-2 px-6">
        <Film className="h-5 w-5 text-primary" />
        <span className="font-display text-base font-semibold">Walkthrough AI</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/dashboard/admin"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              pathname?.startsWith('/dashboard/admin') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>
    </aside>
  );
}
