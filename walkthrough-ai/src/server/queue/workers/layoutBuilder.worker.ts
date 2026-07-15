import { Worker } from 'bullmq';
import { bullConnection } from '../connection';
import { QUEUE_NAMES, type LayoutBuildJobData } from '../queues';
import { db } from '@/server/db';
import { runLayoutBuilder, type AnalyzedImage } from '@/server/ai/agents/layoutBuilder.agent';
import type { RoomAnalysisOutput } from '@/server/ai/schemas/room.schema';

export const layoutBuilderWorker = new Worker<LayoutBuildJobData>(
  QUEUE_NAMES.LAYOUT_BUILD,
  async (job) => {
    const { projectId, jobId } = job.data;
    await db.job.update({ where: { id: jobId }, data: { status: 'RUNNING', startedAt: new Date() } });

    const images = await db.projectImage.findMany({
      where: { projectId },
      include: { analysis: true },
      orderBy: { order: 'asc' },
    });

    const analyzed: AnalyzedImage[] = images
      .filter((img) => img.analysis !== null)
      .map((img) => ({
        imageId: img.id,
        image: { url: img.url },
        analysis: img.analysis!.rawModelOutput as unknown as RoomAnalysisOutput,
      }));

    const { output } = await runLayoutBuilder(analyzed);

    // Persist rooms first so we have real ids to remap tempId references to.
    const tempIdToRealId = new Map<string, string>();
    const createdRooms = await db.$transaction(
      output.rooms.map((room) =>
        db.room.create({
          data: {
            projectId,
            name: room.name,
            roomType: room.roomType,
            order: room.order,
          },
        }),
      ),
    );
    output.rooms.forEach((room, i) => tempIdToRealId.set(room.tempId, createdRooms[i]!.id));

    await db.$transaction(
      output.rooms.flatMap((room) =>
        room.memberImageIds.map((imageId) =>
          db.roomImage.create({
            data: {
              roomId: tempIdToRealId.get(room.tempId)!,
              imageId,
              isPrimary: imageId === room.primaryImageId,
            },
          }),
        ),
      ),
    );

    await db.$transaction(
      output.connections.map((edge) =>
        db.roomConnection.create({
          data: {
            projectId,
            fromRoomId: tempIdToRealId.get(edge.fromTempId)!,
            toRoomId: tempIdToRealId.get(edge.toTempId)!,
            connectionType: edge.connectionType,
            confidence: edge.confidence,
          },
        }),
      ),
    );

    const previousVersion = await db.layout.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const layout = await db.layout.create({
      data: {
        projectId,
        version: (previousVersion?.version ?? 0) + 1,
        roomGraphSnapshot: {
          rooms: output.rooms.map((r) => ({ ...r, id: tempIdToRealId.get(r.tempId) })),
          connections: output.connections.map((c) => ({
            ...c,
            fromRoomId: tempIdToRealId.get(c.fromTempId),
            toRoomId: tempIdToRealId.get(c.toTempId),
          })),
        },
        floorplanEstimate: {
          units: output.floorplanEstimate.units,
          rooms: output.floorplanEstimate.rooms.map((r) => ({
            ...r,
            id: tempIdToRealId.get(r.tempId),
          })),
        },
        reasoning: output.reasoning,
      },
    });

    await db.project.update({ where: { id: projectId }, data: { status: 'LAYOUT_READY' } });
    await db.job.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', progress: 100, resultRef: layout.id, completedAt: new Date() },
    });

    return { layoutId: layout.id };
  },
  { connection: bullConnection, concurrency: 4 },
);

layoutBuilderWorker.on('failed', async (job, err) => {
  if (!job) return;
  await db.job.update({
    where: { id: job.data.jobId },
    data: { status: 'FAILED', error: err.message, attempts: job.attemptsMade },
  }).catch(() => undefined);
  await db.project.update({ where: { id: job.data.projectId }, data: { status: 'FAILED' } }).catch(() => undefined);
});
