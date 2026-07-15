import { Worker } from 'bullmq';
import { bullConnection } from '../connection';
import { QUEUE_NAMES, promptGenerationQueue, type CameraPlanJobData } from '../queues';
import { db } from '@/server/db';
import { runCameraPlanner } from '@/server/ai/agents/cameraPlanner.agent';
import { refundGenerationCredits } from '../pipeline.orchestrator';
import type { LayoutOutput } from '@/server/ai/schemas/layout.schema';

export const cameraPlannerWorker = new Worker<CameraPlanJobData>(
  QUEUE_NAMES.CAMERA_PLAN,
  async (job) => {
    const { projectId, layoutId, jobId, cameraStyle, designStyle, targetProvider, durationSeconds } = job.data;
    await db.job.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } });

    const layout = await db.layout.findUniqueOrThrow({ where: { id: layoutId } });
    // Real Room ids double as the tempId concept from here on downstream —
    // no remapping needed once the Layout has been persisted.
    const layoutOutput = {
      rooms: (layout.roomGraphSnapshot as any).rooms.map((r: any) => ({
        tempId: r.id,
        name: r.name,
        roomType: r.roomType,
        memberImageIds: r.memberImageIds,
        primaryImageId: r.primaryImageId,
        order: r.order,
      })),
      connections: (layout.roomGraphSnapshot as any).connections.map((c: any) => ({
        fromTempId: c.fromRoomId,
        toTempId: c.toRoomId,
        connectionType: c.connectionType,
        confidence: c.confidence,
      })),
      floorplanEstimate: {
        units: 'relative' as const,
        rooms: (layout.floorplanEstimate as any).rooms.map((r: any) => ({
          tempId: r.id,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        })),
      },
      reasoning: layout.reasoning,
    } satisfies LayoutOutput;

    const { output } = await runCameraPlanner({ layout: layoutOutput, cameraStyle, totalDurationSeconds: durationSeconds });

    const cameraPlan = await db.cameraPlan.create({
      data: {
        projectId,
        layoutId,
        cameraStyle,
        totalDurationSeconds: output.totalDurationSeconds,
        reasoning: output.reasoning,
        shots: {
          create: output.shots.map((shot) => ({
            order: shot.order,
            roomId: shot.roomTempId,
            roomName: shot.roomName,
            movement: shot.movement,
            startFraming: shot.startFraming,
            endFraming: shot.endFraming,
            durationSeconds: shot.durationSeconds,
            transitionToNext: shot.transitionToNext,
          })),
        },
      },
    });

    await db.job.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100, resultRef: cameraPlan.id, completedAt: new Date() },
    });

    const promptJob = await db.job.create({ data: { projectId, type: 'PROMPT_GENERATION', status: 'PENDING' } });
    const queueJob = await promptGenerationQueue.add('generate', {
      projectId,
      cameraPlanId: cameraPlan.id,
      jobId: promptJob.id,
      designStyle,
      targetProvider,
      durationSeconds,
    });
    await db.job.update({ where: { id: promptJob.id }, data: { queueJobId: queueJob.id } });

    return { cameraPlanId: cameraPlan.id };
  },
  { connection: bullConnection, concurrency: 4 },
);

cameraPlannerWorker.on('failed', async (job, err) => {
  if (!job) return;
  await db.job.update({
    where: { id: job.data.jobId },
    data: { status: 'FAILED', error: err.message, attempts: job.attemptsMade },
  }).catch(() => undefined);

  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    const project = await db.project.update({
      where: { id: job.data.projectId },
      data: { status: 'FAILED' },
      include: { user: true },
    }).catch(() => null);
    if (project) {
      // Camera-plan failure means we never reached video generation — refund the full reservation.
      const provider = job.data.targetProvider;
      const { getVideoProvider } = await import('@/server/ai/video-providers/registry');
      const cost = getVideoProvider(provider).estimateCostCredits(job.data.durationSeconds);
      await refundGenerationCredits(project.userId, cost);
    }
  }
});
