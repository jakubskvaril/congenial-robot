'use client';

import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Film } from 'lucide-react';

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Film className="h-5 w-5 text-primary" />
          Walkthrough <span className="text-gradient-gold">AI</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="/#pipeline" className="hover:text-foreground">How it works</Link>
          <Link href="/#features" className="hover:text-foreground">Features</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
        </nav>

        <div className="flex items-center gap-3">
          <SignedOut>
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/sign-up">Start free</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
