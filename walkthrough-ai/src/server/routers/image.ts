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

export const imageRouter = router({
  // Called by the client after UploadThing/S3 upload completes for each
  // file, to register the resulting object as a ProjectImage row.
  register: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        images: z
          .array(
            z.object({
              storageKey: z.string(),
              url: z.string().url(),
              width: z.number().optional(),
              height: z.number().optional(),
            }),
          )
          .min(1)
          .max(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await assertProjectOwnership(input.projectId, ctx.user.id);
      const existingCount = await db.projectImage.count({ where: { projectId: project.id } });
      if (existingCount + input.images.length > 30) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A project supports a maximum of 30 images.' });
      }

      const created = await db.$transaction(
        input.images.map((img, i) =>
          db.projectImage.create({
            data: {
              projectId: project.id,
              storageKey: img.storageKey,
              url: img.url,
              width: img.width,
              height: img.height,
              order: existingCount + i,
            },
          }),
        ),
      );

      if (project.status === 'DRAFT') {
        await db.project.update({ where: { id: project.id }, data: { status: 'UPLOADING' } });
      }

      return created;
    }),

  listByProject: protectedProcedure.input(z.object({ projectId: z.string() })).query(async ({ ctx, input }) => {
    await assertProjectOwnership(input.projectId, ctx.user.id);
    return db.projectImage.findMany({
      where: { projectId: input.projectId },
      orderBy: { order: 'asc' },
      include: { analysis: true },
    });
  }),

  reorder: protectedProcedure
    .input(z.object({ projectId: z.string(), orderedImageIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwnership(input.projectId, ctx.user.id);
      await db.$transaction(
        input.orderedImageIds.map((id, order) =>
          db.projectImage.update({ where: { id }, data: { order } }),
        ),
      );
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ projectId: z.string(), imageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertProjectOwnership(input.projectId, ctx.user.id);
      await db.projectImage.delete({ where: { id: input.imageId } });
      return { success: true };
    }),
});
