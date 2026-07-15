import { Worker } from 'bullmq';
import { bullConnection } from '../connection';
import { QUEUE_NAMES, type VideoPollJobData } from '../queues';
import { db } from '@/server/db';
import { getVideoProvider } from '@/server/ai/video-providers/registry';
import { applyVideoGenerationResult } from '../videoResult.service';

export const videoPollWorker = new Worker<VideoPollJobData>(
  QUEUE_NAMES.VIDEO_POLL,
  async (job) => {
    const { generatedVideoId } = job.data;
    const video = await db.generatedVideo.findUnique({ where: { id: generatedVideoId } });

    if (!video || video.status === 'COMPLETED' || video.status === 'FAILED') {
      return; // webhook already resolved it — nothing to do
    }
    if (!video.providerJobId) {
      throw new Error('Video has no providerJobId yet, retrying'); // BullMQ backoff handles the wait
    }

    const provider = getVideoProvider(video.provider);
    const result = await provider.checkStatus(video.providerJobId);

    if (result.state === 'QUEUED' || result.state === 'PROCESSING') {
      throw new Error('Still processing at provider, retrying'); // triggers backoff retry
    }

    await applyVideoGenerationResult(generatedVideoId, result);
  },
  { connection: bullConnection, concurrency: 10 },
);
