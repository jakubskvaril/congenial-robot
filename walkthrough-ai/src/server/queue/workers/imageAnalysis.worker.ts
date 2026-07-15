import { Worker } from 'bullmq';
import { bullConnection } from '../connection';
import { QUEUE_NAMES, layoutBuildQueue, type ImageAnalysisJobData } from '../queues';
import { db } from '@/server/db';
import { runImageUnderstanding } from '@/server/ai/agents/imageUnderstanding.agent';

export const imageAnalysisWorker = new Worker<ImageAnalysisJobData>(
  QUEUE_NAMES.IMAGE_ANALYSIS,
  async (job) => {
    const { projectId, imageId, jobId } = job.data;

    await db.job.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } });

    const image = await db.projectImage.findUniqueOrThrow({ where: { id: imageId } });
    const { output, modelVersion } = await runImageUnderstanding({ url: image.url });

    const analysis = await db.roomAnalysis.create({
      data: {
        imageId,
        roomType: output.roomType,
        roomTypeConfidence: output.roomTypeConfidence,
        style: output.style,
        dimensionsEstimate: output.dimensionsEstimate,
        materials: output.materials,
        furniture: output.furniture,
        windowPlacement: output.windowPlacement,
        doorPlacement: output.doorPlacement,
        lighting: output.lighting,
        outdoorVisibility: output.outdoorVisibility,
        outdoorFeatures: output.outdoorFeatures ?? undefined,
        rawModelOutput: output,
        modelVersion,
      },
    });

    await db.job.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100, resultRef: analysis.id, completedAt: new Date() },
    });

    // Fan-in: once every image in the project has an analysis, kick off
    // Agent 2 (Layout Builder) exactly once.
    const remaining = await db.projectImage.count({ where: { projectId, analysis: null } });
    if (remaining === 0) {
      await db.project.update({ where: { id: projectId }, data: { status: 'ANALYZED' } });

      const alreadyBuilding = await db.job.findFirst({
        where: { projectId, type: 'LAYOUT_BUILD', status: { in: ['PENDING', 'RUNNING'] } },
      });
      if (!alreadyBuilding) {
        await db.project.update({ where: { id: projectId }, data: { status: 'BUILDING_LAYOUT' } });
        const layoutJob = await db.job.create({ data: { projectId, type: 'LAYOUT_BUILD', status: 'PENDING' } });
        const queueJob = await layoutBuildQueue.add('build', { projectId, jobId: layoutJob.id });
        await db.job.update({ where: { id: layoutJob.id }, data: { queueJobId: queueJob.id } });
      }
    }

    return { analysisId: analysis.id };
  },
  { connection: bullConnection, concurrency: 8 },
);

imageAnalysisWorker.on('failed', async (job, err) => {
  if (!job) return;
  await db.job.update({
    where: { id: job.data.jobId },
    data: { status: 'FAILED', error: err.message, attempts: job.attemptsMade },
  }).catch(() => undefined);
});
