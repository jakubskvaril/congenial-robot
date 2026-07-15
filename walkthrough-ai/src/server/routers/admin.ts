import { z } from 'zod';
import { router, adminProcedure } from '@/server/trpc';
import { db } from '@/server/db';

export const adminRouter = router({
  stats: adminProcedure.query(async () => {
    const [userCount, projectCount, videoCount, completedVideoCount, failedVideoCount] = await Promise.all([
      db.user.count(),
      db.project.count(),
      db.generatedVideo.count(),
      db.generatedVideo.count({ where: { status: 'COMPLETED' } }),
      db.generatedVideo.count({ where: { status: 'FAILED' } }),
    ]);
    const activeSubscriptions = await db.subscription.count({ where: { status: 'ACTIVE' } });

    return { userCount, projectCount, videoCount, completedVideoCount, failedVideoCount, activeSubscriptions };
  }),

  listUsers: adminProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const users = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: { _count: { select: { projects: true } } },
      });
      let nextCursor: string | undefined;
      if (users.length > input.limit) nextCursor = users.pop()!.id;
      return { users, nextCursor };
    }),

  listProjects: adminProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const projects = await db.project.findMany({
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: { user: { select: { email: true } }, _count: { select: { videos: true } } },
      });
      let nextCursor: string | undefined;
      if (projects.length > input.limit) nextCursor = projects.pop()!.id;
      return { projects, nextCursor };
    }),

  adjustCredits: adminProcedure
    .input(z.object({ userId: z.string(), amount: z.number().int(), reason: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
        const balanceAfter = user.creditBalance + input.amount;
        await tx.user.update({ where: { id: input.userId }, data: { creditBalance: balanceAfter } });
        const entry = await tx.creditLedgerEntry.create({
          data: {
            userId: input.userId,
            amount: input.amount,
            reason: 'ADMIN_ADJUSTMENT',
            balanceAfter,
            metadata: { reason: input.reason, adjustedBy: ctx.user.id },
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: ctx.user.id,
            action: 'credits.adjusted',
            targetType: 'User',
            targetId: input.userId,
            metadata: { amount: input.amount, reason: input.reason },
          },
        });
        return entry;
      });
      return result;
    }),
});
