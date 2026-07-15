import { router } from '@/server/trpc';
import { projectRouter } from './project';
import { imageRouter } from './image';
import { roomRouter } from './room';
import { layoutRouter } from './layout';
import { promptRouter } from './prompt';
import { videoRouter } from './video';
import { jobRouter } from './job';
import { creditRouter } from './credit';
import { billingRouter } from './billing';
import { adminRouter } from './admin';

export const appRouter = router({
  project: projectRouter,
  image: imageRouter,
  room: roomRouter,
  layout: layoutRouter,
  prompt: promptRouter,
  video: videoRouter,
  job: jobRouter,
  credit: creditRouter,
  billing: billingRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
