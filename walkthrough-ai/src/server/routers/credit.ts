import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { db } from '@/server/db';

export const creditRouter = router({
  balance: protectedProcedure.query(async ({ ctx }) => {
    return { balance: ctx.user.creditBalance };
  }),

  ledger: protectedProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(100).default(30) }))
    .query(async ({ ctx, input }) => {
      const entries = await db.creditLedgerEntry.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      let nextCursor: string | undefined;
      if (entries.length > input.limit) nextCursor = entries.pop()!.id;
      return { entries, nextCursor };
    }),
});
