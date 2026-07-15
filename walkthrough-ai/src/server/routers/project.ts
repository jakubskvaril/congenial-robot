import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/trpc';
import { db } from '@/server/db';
import { enqueueImageAnalysis, enqueueGeneration } from '@/server/queue/pipeline.orchestrator';

async function assertProjectOwnership(projectId: string, userId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
  if (project.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN' });
  return project;
}

export const projectRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        propertyType: z.enum(['APARTMENT', 'HOUSE', 'VILLA', 'HOTEL_ROOM', 'AIRBNB', 'OTHER']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return db.project.create({
        data: { userId: ctx.user.id, name: input.name, propertyType: input.propertyType, status: 'DRAFT' },
      });
    }),

  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const projects = await db.project.findMany({
        where: { userId: ctx.user.id },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: {
          _count: { select: { images: true, videos: true } },
          videos: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });

      let nextCursor: string | undefined;
      if (projects.length > input.limit) {
        nextCursor = projects.pop()!.id;
      }
      return { projects, nextCursor };
    }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const project = await assertProjectOwnership(input.id, ctx.user.id);
    return db.project.findUniqueOrThrow({
      where: { id: project.id },
      include: {
        images: { orderBy: { order: 'asc' } },
        rooms: { orderBy: { order: 'asc' }, include: { images: true } },
        roomConnections: true,
        layouts: { orderBy: { version: 'desc' }, take: 1 },
        videos: { orderBy: { createdAt: 'desc' } },
      },
    });
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await assertProjectOwnership(input.id, ctx.user.id);
    await db.project.delete({ where: { id: input.id } });
    return { success: true };
  }),

  startAnalysis: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await assertProjectOwnership(input.projectId, ctx.user.id);
      const imageCount = await db.projectImage.count({ where: { projectId: project.id } });
      if (imageCount < 5) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Upload at least 5 images before analyzing.' });
      }
      if (imageCount > 30) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A maximum of 30 images is supported per project.' });
      }
      await enqueueImageAnalysis(project.id);
      return { success: true };
    }),

  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        designStyle: z.enum(['LUXURY', 'MODERN', 'MEDITERRANEAN', 'SCANDINAVIAN', 'MINIMAL', 'COZY']),
        cameraStyle: z.enum(['GIMBAL', 'DRONE', 'FPV', 'HANDHELD']),
        durationSeconds: z.union([z.literal(5), z.literal(8), z.literal(12), z.literal(20)]),
        targetProvider: z.enum(['VEO', 'KLING', 'RUNWAY', 'HAILUO']).default('VEO'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await assertProjectOwnership(input.projectId, ctx.user.id);
      if (project.status !== 'LAYOUT_READY' && project.status !== 'FAILED' && project.status !== 'COMPLETED') {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: `Project is not ready to generate (status: ${project.status})` });
      }
      const result = await enqueueGeneration({
        projectId: project.id,
        userId: ctx.user.id,
        cameraStyle: input.cameraStyle,
        designStyle: input.designStyle,
        targetProvider: input.targetProvider,
        durationSeconds: input.durationSeconds,
      });
      return result;
    }),
});
