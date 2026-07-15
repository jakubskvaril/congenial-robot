import { Worker } from 'bullmq';
import { bullConnection } from '../connection';
import { QUEUE_NAMES, videoGenerationQueue, type PromptGenerationJobData } from '../queues';
import { db } from '@/server/db';
import { runPromptGenerator } from '@/server/ai/agents/promptGenerator.agent';
import { getVideoProvider } from '@/server/ai/video-providers/registry';
import { refundGenerationCredits } from '../pipeline.orchestrator';
import type { RoomAnalysisOutput } from '@/server/ai/schemas/room.schema';
import type { LayoutOutput } from '@/server/ai/schemas/layout.schema';

export const promptGeneratorWorker = new Worker<PromptGenerationJobData>(
  QUEUE_NAMES.PROMPT_GENERATION,
  async (job) => {
    const { projectId, cameraPlanId, jobId, designStyle, targetProvider, durationSeconds } = job.data;
    await db.job.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } });

    const cameraPlan = await db.cameraPlan.findUniqueOrThrow({
      where: { id: cameraPlanId },
      include: { shots: { orderBy: { order: 'asc' } }, layout: true },
    });

    const layoutOutput = {
      rooms: (cameraPlan.layout.roomGraphSnapshot as any).rooms.map((r: any) => ({
        tempId: r.id,
        name: r.name,
        roomType: r.roomType,
        memberImageIds: r.memberImageIds,
        primaryImageId: r.primaryImageId,
        order: r.order,
      })),
      connections: [] as LayoutOutput['connections'],
      floorplanEstimate: { units: 'relative' as const, rooms: [] as LayoutOutput['floorplanEstimate']['rooms'] },
      reasoning: cameraPlan.layout.reasoning,
    } satisfies LayoutOutput;

    const roomAnalysesByTempId: Record<string, RoomAnalysisOutput> = {};
    for (const room of layoutOutput.rooms) {
      const primaryImageId = room.primaryImageId as string;
      const analysis = await db.roomAnalysis.findUnique({ where: { imageId: primaryImageId } });
      if (analysis) {
        roomAnalysesByTempId[room.tempId] = analysis.rawModelOutput as unknown as RoomAnalysisOutput;
      }
    }

    const { output } = await runPromptGenerator({
      layout: layoutOutput,
      cameraPlan: {
        cameraStyle: cameraPlan.cameraStyle,
        totalDurationSeconds: cameraPlan.totalDurationSeconds,
        reasoning: cameraPlan.reasoning,
        shots: cameraPlan.shots.map((s) => ({
          order: s.order,
          roomTempId: s.roomId,
          roomName: s.roomName,
          movement: s.movement,
          startFraming: s.startFraming,
          endFraming: s.endFraming,
          durationSeconds: s.durationSeconds,
          transitionToNext: s.transitionToNext,
        })),
      },
      roomAnalysesByTempId,
      designStyle,
      targetProvider,
      durationSeconds,
    });

    const prompt = await db.prompt.create({
      data: {
        projectId,
        cameraPlanId,
        designStyle,
        targetProvider,
        durationSeconds: output.durationSeconds,
        promptText: output.promptText,
        negativePrompt: output.negativePrompt,
        structuredShots: output.structuredShots,
      },
    });

    await db.job.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100, resultRef: prompt.id, completedAt: new Date() },
    });
    await db.project.update({ where: { id: projectId }, data: { status: 'PROMPT_READY' } });

    const provider = getVideoProvider(targetProvider);
    const generatedVideo = await db.generatedVideo.create({
      data: {
        projectId,
        promptId: prompt.id,
        provider: targetProvider,
        status: 'QUEUED',
        durationSeconds: output.durationSeconds,
        costCredits: provider.estimateCostCredits(output.durationSeconds),
      },
    });

    await db.project.update({ where: { id: projectId }, data: { status: 'GENERATING_VIDEO' } });

    const videoJob = await db.job.create({ data: { projectId, type: 'VIDEO_GENERATION', status: 'PENDING' } });
    const queueJob = await videoGenerationQueue.add('generate', {
      projectId,
      promptId: prompt.id,
      generatedVideoId: generatedVideo.id,
      jobId: videoJob.id,
      provider: targetProvider,
    });
    await db.job.update({ where: { id: videoJob.id }, data: { queueJobId: queueJob.id } });

    return { promptId: prompt.id, generatedVideoId: generatedVideo.id };
  },
  { connection: bullConnection, concurrency: 4 },
);

promptGeneratorWorker.on('failed', async (job, err) => {
  if (!job) return;
  await db.job.update({
    where: { id: job.data.jobId },
    data: { status: 'FAILED', error: err.message, attempts: job.attemptsMade },
  }).catch(() => undefined);

  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    const project = await db.project.update({
      where: { id: job.data.projectId },
      data: { status: 'FAILED' },
    }).catch(() => null);
    if (project) {
      const cost = getVideoProvider(job.data.targetProvider).estimateCostCredits(job.data.durationSeconds);
      await refundGenerationCredits(project.userId, cost);
    }
  }
});
