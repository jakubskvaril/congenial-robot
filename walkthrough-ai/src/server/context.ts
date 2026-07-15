import { auth } from '@clerk/nextjs/server';
import type { User } from '@prisma/client';
import { db } from './db';

/**
 * Per-request tRPC context. Resolves the Clerk session to our synced
 * `User` row (kept in sync via the /api/webhooks/clerk route) so
 * procedures can rely on `ctx.user.id`, `ctx.user.creditBalance`, etc.
 * without re-querying on every call site.
 */
export async function createContext() {
  const { userId: clerkId } = await auth();

  let user: User | null = null;
  if (clerkId) {
    user = await db.user.findUnique({ where: { clerkId } });
  }

  return {
    clerkId,
    userId: user?.id ?? null,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
