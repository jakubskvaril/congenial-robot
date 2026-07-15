/**
 * Standalone worker process entrypoint — run via `npm run worker`, deployed
 * separately from the Next.js web process (e.g. a Railway/Render/Fly worker
 * service, or an ECS task). Never import this file from Next.js route
 * handlers; workers must run in a long-lived Node process, not on the
 * serverless request path.
 */
import { imageAnalysisWorker } from './imageAnalysis.worker';
import { layoutBuilderWorker } from './layoutBuilder.worker';
import { cameraPlannerWorker } from './cameraPlanner.worker';
import { promptGeneratorWorker } from './promptGenerator.worker';
import { videoGenerationWorker } from './videoGeneration.worker';
import { videoPollWorker } from './videoPoll.worker';

const workers = [
  imageAnalysisWorker,
  layoutBuilderWorker,
  cameraPlannerWorker,
  promptGeneratorWorker,
  videoGenerationWorker,
  videoPollWorker,
];

console.log(`[worker] ${workers.length} pipeline workers started`);

async function shutdown() {
  console.log('[worker] shutting down gracefully...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
