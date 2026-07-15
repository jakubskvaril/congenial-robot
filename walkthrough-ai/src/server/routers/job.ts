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

// Powers the generation-progress UI: polled (or subscribed to, once a
// websocket/SSE layer is added) while status is one of the in-flight
// ProjectStatus values, to show a live pipeline-stage indicator.
export const jobRouter = router({
  statusByProject: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    await assertProjectOwnership(input.projectId, ctx.user.id);
    const project = await db.project.findUniqueOrThrow({ where: { id: input.projectId }, select: { status: true } });
    const jobs = await db.job.findMany({
      where: { projectId: input.projectId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return { projectStatus: project.status, jobs };
  }),
});
