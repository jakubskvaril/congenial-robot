import { db } from '@/server/db';
import { refundGenerationCredits } from './pipeline.orchestrator';
import type { VideoGenerationResult } from '@/server/ai/video-providers/types';

/**
 * Single choke point for terminal video-generation outcomes, called from
 * both the provider webhook route and the fallback poller so status
 * transitions and credit refunds are handled identically regardless of
 * how the result arrived.
 */
export async function applyVideoGenerationResult(generatedVideoId: string, result: VideoGenerationResult) {
  const video = await db.generatedVideo.findUnique({ where: { id: generatedVideoId } });
  if (!video || video.status === 'COMPLETED' || video.status === 'FAILED') {
    return; // already terminal — idempotent no-op (webhook + poller can race)
  }

  if (result.state === 'COMPLETED') {
    await db.generatedVideo.update({
      where: { id: generatedVideoId },
      data: {
        status: 'COMPLETED',
        videoUrl: result.videoUrl,
        thumbnailUrl: result.thumbnailUrl,
        resolution: result.resolution,
        completedAt: new Date(),
      },
    });
    await db.project.update({ where: { id: video.projectId }, data: { status: 'COMPLETED' } });
    return;
  }

  if (result.state === 'FAILED') {
    await db.generatedVideo.update({
      where: { id: generatedVideoId },
      data: { status: 'FAILED', error: result.error ?? 'Video generation failed', completedAt: new Date() },
    });
    await db.project.update({ where: { id: video.projectId }, data: { status: 'FAILED' } });

    const project = await db.project.findUniqueOrThrow({ where: { id: video.projectId } });
    await refundGenerationCredits(project.userId, video.costCredits, generatedVideoId);
    return;
  }

  // QUEUED / PROCESSING — nothing to persist, still in flight.
}
