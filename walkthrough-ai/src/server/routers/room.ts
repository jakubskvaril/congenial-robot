import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/trpc';
import { db } from '@/server/db';
import { layoutBuildQueue } from '@/server/queue/queues';

async function assertProjectOwnership(projectId: string, userId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
  if (project.userId !== userId) throw new TRPCError({ code: 'FORBIDDEN' });
  return project;
}

export const roomRouter = router({
  listByProject: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    await assertProjectOwnership(input.projectId, ctx.user.id);
    return db.room.findMany({
      where: { projectId: input.projectId },
      orderBy: { order: 'asc' },
      include: { images: { include: { image: true } } },
    });
  }),

  // Step 4 of the user flow: "user edits if necessary". Room name/type/
  // order edits never re-run Agent 1 — they just correct Agent 2's
  // grouping/labeling before the user proceeds to generation.
  update: protectedProcedure
    .input(
      z.object({
        roomId: z.string(),
        name: z.string().min(1).max(120).optional(),
        roomType: z
          .enum([
            'LIVING_ROOM', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'DINING_ROOM', 'HOME_OFFICE',
            'HALLWAY', 'ENTRYWAY', 'GARAGE', 'GYM', 'TERRACE', 'BALCONY', 'GARDEN',
            'POOL_AREA', 'ROOFTOP', 'VIEW_EXTERIOR', 'OTHER',
          ])
          .optional(),
        order: z.number().int().optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const room = await db.room.findUniqueOrThrow({ where: { id: input.roomId } });
      await assertProjectOwnership(room.projectId, ctx.user.id);
      const { roomId, ...data } = input;
      return db.room.update({ where: { id: roomId }, data: { ...data, isUserEdited: true } });
    }),

  updateConnection: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        connectionType: z.enum([
          'DOOR', 'OPEN_ARCHWAY', 'HALLWAY', 'STAIRCASE', 'OPEN_PLAN', 'OUTDOOR_TRANSITION', 'SLIDING_DOOR',
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const connection = await db.roomConnection.findUniqueOrThrow({ where: { id: input.connectionId } });
      await assertProjectOwnership(connection.projectId, ctx.user.id);
      return db.roomConnection.update({
        where: { id: input.connectionId },
        data: { connectionType: input.connectionType, isUserEdited: true },
      });
    }),

  createConnection: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        fromRoomId: z.string(),
        toRoomId: z.string(),
        connectionType: z.enum([
          'DOOR', 'OPEN_ARCHWAY', 'HALLWAY', 'STAIRCASE', 'OPEN_PLAN', 'OUTDOOR_TRANSITION', 'SLIDING_DOOR',
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwnership(input.projectId, ctx.user.id);
      return db.roomConnection.create({
        data: {
          projectId: input.projectId,
          fromRoomId: input.fromRoomId,
          toRoomId: input.toRoomId,
          connectionType: input.connectionType,
          confidence: 1,
          isUserEdited: true,
        },
      });
    }),

  deleteConnection: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const connection = await db.roomConnection.findUniqueOrThrow({ where: { id: input.connectionId } });
      await assertProjectOwnership(connection.projectId, ctx.user.id);
      await db.roomConnection.delete({ where: { id: input.connectionId } });
      return { success: true };
    }),

  // Re-runs Agent 2 from scratch — useful if the user made heavy manual
  // edits and wants the AI to re-propose a layout instead.
  regenerateLayout: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await assertProjectOwnership(input.projectId, ctx.user.id);
      await db.project.update({ where: { id: project.id }, data: { status: 'BUILDING_LAYOUT' } });
      const job = await db.job.create({ data: { projectId: project.id, type: 'LAYOUT_BUILD', status: 'PENDING' } });
      const queueJob = await layoutBuildQueue.add('build', { projectId: project.id, jobId: job.id });
      await db.job.update({ where: { id: job.id }, data: { queueJobId: queueJob.id } });
      return { success: true };
    }),
});
