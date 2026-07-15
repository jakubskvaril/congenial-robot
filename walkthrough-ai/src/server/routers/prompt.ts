import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/trpc';
import { db } from '@/server/db';

async function assertProjectOwnership(projectId: string, userId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
  if (project.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN' });
  return project;
}

export const promptRouter = router({
  // Powers the "Prompt preview" feature — lets users inspect exactly what
  // was sent to the video model for transparency/debugging.
  getLatest: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    await assertProjectOwnership(input.projectId, ctx.user.id);
    return db.prompt.findFirst({
      where: { projectId: input.projectId },
      orderBy: { createdAt: 'desc' },
      include: { cameraPlan: { include: { shots: { orderBy: { order: 'asc' } } } } },
    });
  }),

  listByProject: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    await assertProjectOwnership(input.projectId, ctx.user.id);
    return db.prompt.findMany({ where: { projectId: input.projectId }, orderBy: { createdAt: 'desc' } });
  }),
});
