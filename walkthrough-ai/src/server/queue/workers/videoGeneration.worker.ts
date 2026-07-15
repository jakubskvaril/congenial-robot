import { Worker } from 'bullmq';
import { bullConnection } from '../connection';
import { QUEUE_NAMES, videoPollQueue, type VideoGenerationJobData } from '../queues';
import { db } from '@/server/db';
import { getVideoProvider } from '@/server/ai/video-providers/registry';

export const videoGenerationWorker = new Worker<VideoGenerationJobData>(
  QUEUE_NAMES.VIDEO_GENERATION,
  async (job) => {
    const { promptId, generatedVideoId, jobId, provider: providerName } = job.data;
    await db.job.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } });

    const prompt = await db.prompt.findUniqueOrThrow({
      where: { id: promptId },
      include: {
        cameraPlan: { include: { layout: true } },
      },
    });

    const roomGraph = prompt.cameraPlan.layout.roomGraphSnapshot as any;
    const referenceImageUrls: string[] = [];
    for (const room of roomGraph.rooms) {
      if (room.primaryImageId) {
        const image = await db.projectImage.findUnique({ where: { id: room.primaryImageId } });
        if (image) referenceImageUrls.push(image.url);
      }
    }

    const provider = getVideoProvider(providerName);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const handle = await provider.submit({
      promptText: prompt.promptText,
      negativePrompt: prompt.negativePrompt,
      durationSeconds: prompt.durationSeconds,
      aspectRatio: '16:9',
      referenceImageUrls,
      // provider is passed as a query param so the shared webhook route
      // knows which adapter's parseWebhook/signature-verification to use.
      callbackUrl: `${appUrl}/api/webhooks/video-provider?provider=${providerName}`,
      metadata: { generatedVideoId },
    });

    await db.generatedVideo.update({
      where: { id: generatedVideoId },
      data: { providerJobId: handle.providerJobId, status: 'PROCESSING' },
    });

    await db.job.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 60, resultRef: generatedVideoId, completedAt: new Date() },
    });

    // Safety net: most providers deliver a webhook, but we poll in case
    // it's delayed or dropped. First check after 90s, BullMQ retry
    // backoff handles subsequent attempts via the poll queue's own job.
    await videoPollQueue.add(
      'poll',
      { generatedVideoId },
      { delay: 90_000, attempts: 20, backoff: { type: 'exponential', delay: 30_000 } },
    );

    if (handle.immediateResult) {
      return handle.immediateResult;
    }
    return { providerJobId: handle.providerJobId };
  },
  { connection: bullConnection, concurrency: 6 },
);

videoGenerationWorker.on('failed', async (job, err) => {
  if (!job) return;
  await db.job.update({
    where: { id: job.data.jobId },
    data: { status: 'FAILED', error: err.message, attempts: job.attemptsMade },
  }).catch(() => undefined);

  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await db.generatedVideo.update({
      where: { id: job.data.generatedVideoId },
      data: { status: 'FAILED', error: err.message },
    }).catch(() => undefined);
    await db.project.update({ where: { id: job.data.projectId }, data: { status: 'FAILED' } }).catch(() => undefined);
  }
});
