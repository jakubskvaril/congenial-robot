import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { db } from '@/server/db';

const f = createUploadthing();

export const ourFileRouter = {
  // Primary drag-and-drop upload path used by the Upload screen (step 1
  // of the user flow). UploadThing handles chunked/resumable upload and
  // CDN hosting directly; StorageClient (src/server/storage/client.ts)
  // is used instead for server-originated writes (e.g. API-based project
  // creation via presigned S3/Supabase URLs).
  propertyImage: f({ image: { maxFileSize: '8MB', maxFileCount: 30 } })
    .input(z.object({ projectId: z.string() }))
    .middleware(async ({ input }) => {
      const { userId: clerkId } = await auth();
      if (!clerkId) throw new UploadThingError('Unauthorized');

      const user = await db.user.findUnique({ where: { clerkId } });
      if (!user) throw new UploadThingError('Unauthorized');

      const project = await db.project.findUnique({ where: { id: input.projectId } });
      if (!project || project.userId !== user.id) {
        throw new UploadThingError('Project not found or not owned by user');
      }

      return { userId: user.id, projectId: input.projectId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Recompute the count per-file (rather than snapshotting once in
      // middleware) so a batch of parallel uploads still gets a unique,
      // increasing sort order instead of every file racing to the same value.
      const order = await db.projectImage.count({ where: { projectId: metadata.projectId } });
      const image = await db.projectImage.create({
        data: {
          projectId: metadata.projectId,
          storageKey: file.key,
          url: file.url,
          order,
        },
      });
      return { imageId: image.id, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
