import { TRPCError } from '@trpc/server';
import type { CameraStyle, DesignStyle, VideoProviderName as PrismaVideoProviderName } from '@prisma/client';
import { db } from '@/server/db';
import { imageAnalysisQueue, cameraPlanQueue } from './queues';
import { getVideoProvider } from '@/server/ai/video-providers/registry';

/**
 * Entry point for stage 1 (Agent 1). Called right after upload completes.
 * Creates one Job + one queue entry per image that doesn't yet have a
 * RoomAnalysis, and flips the project into ANALYZING.
 */
export async function enqueueImageAnalysis(projectId: string) {
  const images = await db.projectImage.findMany({
    where: { projectId, analysis: null },
    select: { id: true },
  });

  if (images.length === 0) return;

  await db.project.update({ where: { id: projectId }, data: { status: 'ANALYZING' } });

  for (const image of images) {
    const job = await db.job.create({
      data: { projectId, type: 'IMAGE_ANALYSIS', status: 'PENDING' },
    });
    const queueJob = await imageAnalysisQueue.add('analyze', {
      projectId,
      imageId: image.id,
      jobId: job.id,
    });
    await db.job.update({ where: { id: job.id }, data: { queueJobId: queueJob.id } });
  }
}

/**
 * Entry point for stages 3-5 (Agents 3, 4, 5), triggered by the user's
 * "Generate" action once they've picked design style, camera style, and
 * duration. Reserves credits up front (debited immediately, refunded on
 * pipeline failure) so we never generate a video we can't charge for.
 */
export async function enqueueGeneration(args: {
  projectId: string;
  userId: string;
  cameraStyle: CameraStyle;
  designStyle: DesignStyle;
  targetProvider: PrismaVideoProviderName;
  durationSeconds: number;
}) {
  const { projectId, userId, cameraStyle, designStyle, targetProvider, durationSeconds } = args;

  const layout = await db.layout.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
  });
  if (!layout) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Layout not ready yet' });
  }

  const provider = getVideoProvider(targetProvider);
  const costCredits = provider.estimateCostCredits(durationSeconds);

  await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.creditBalance < costCredits) {
      throw new TRPCError({ code: 'PAYMENT_REQUIRED', message: 'Insufficient credits' });
    }
    const balanceAfter = user.creditBalance - costCredits;
    await tx.user.update({ where: { id: userId }, data: { creditBalance: balanceAfter } });
    await tx.creditLedgerEntry.create({
      data: {
        userId,
        amount: -costCredits,
        reason: 'VIDEO_GENERATION',
        balanceAfter,
        metadata: { projectId, targetProvider, durationSeconds },
      },
    });
  });

  await db.project.update({ where: { id: projectId }, data: { status: 'PLANNING_CAMERA' } });

  const job = await db.job.create({ data: { projectId, type: 'CAMERA_PLAN', status: 'PENDING' } });
  const queueJob = await cameraPlanQueue.add('plan', {
    projectId,
    layoutId: layout.id,
    jobId: job.id,
    cameraStyle,
    designStyle,
    targetProvider,
    durationSeconds,
  });
  await db.job.update({ where: { id: job.id }, data: { queueJobId: queueJob.id } });

  return { reservedCredits: costCredits };
}

/**
 * Refunds a video-generation credit reservation. Called whenever the
 * pipeline fails after credits were debited (camera plan, prompt, or
 * video generation stage failure) and from the provider webhook on a
 * FAILED terminal state.
 */
export async function refundGenerationCredits(userId: string, amount: number, relatedVideoId?: string) {
  if (amount <= 0) return;
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const balanceAfter = user.creditBalance + amount;
    await tx.user.update({ where: { id: userId }, data: { creditBalance: balanceAfter } });
    await tx.creditLedgerEntry.create({
      data: { userId, amount, reason: 'REFUND', balanceAfter, relatedVideoId },
    });
  });
}
