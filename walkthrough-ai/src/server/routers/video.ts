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

export const videoRouter = router({
  listByProject: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    await assertProjectOwnership(input.projectId, ctx.user.id);
    return db.generatedVideo.findMany({ where: { projectId: input.projectId }, orderBy: { createdAt: 'desc' } });
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const video = await db.generatedVideo.findUniqueOrThrow({ where: { id: input.id } });
    await assertProjectOwnership(video.projectId, ctx.user.id);
    return video;
  }),

  // Full generation history across all of the user's projects, for a
  // global "Video History" view.
  history: protectedProcedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const videos = await db.generatedVideo.findMany({
        where: { project: { userId: ctx.user.id } },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: { project: { select: { name: true, id: true } } },
      });
      let nextCursor: string | undefined;
      if (videos.length > input.limit) nextCursor = videos.pop()!.id;
      return { videos, nextCursor };
    }),
});
