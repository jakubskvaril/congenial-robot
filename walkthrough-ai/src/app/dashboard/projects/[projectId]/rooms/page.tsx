'use client';

import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/Topbar';
import { PipelineProgress } from '@/components/pipeline/PipelineProgress';
import { FloorplanPreview } from '@/components/rooms/FloorplanPreview';
import { RoomCard } from '@/components/rooms/RoomCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';
import { isProjectInProgress } from '@/lib/status';
import { ArrowRight, RefreshCw } from 'lucide-react';

export default function RoomsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();

  const { data: project } = trpc.project.get.useQuery(
    { id: projectId },
    { refetchInterval: (q) => (isProjectInProgress(q.state.data?.status ?? 'DRAFT') ? 3000 : false) },
  );
  const { data: rooms, isLoading: roomsLoading } = trpc.room.listByProject.useQuery(
    { projectId },
    { enabled: !!project && !isProjectInProgress(project.status) },
  );
  const { data: layout } = trpc.layout.getLatest.useQuery(
    { projectId },
    { enabled: !!project && !isProjectInProgress(project.status) },
  );

  const regenerate = trpc.room.regenerateLayout.useMutation({
    onSuccess: () => toast.success('Rebuilding layout…'),
    onError: (err) => toast.error(err.message),
  });

  const inProgress = project ? isProjectInProgress(project.status) : true;
  const ready = project?.status === 'LAYOUT_READY' || project?.status === 'COMPLETED' || project?.status === 'FAILED';

  const floorplanRooms = (layout?.floorplanEstimate as any)?.rooms ?? [];
  const roomNames = Object.fromEntries((rooms ?? []).map((r) => [r.id, r.name]));

  return (
    <div>
      <Topbar title="Detected rooms" />
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Step 2 — Review detected rooms</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Agents 1 and 2 analyzed your photos, merged duplicates, and inferred how rooms connect.
            Rename or reclassify anything that looks off before generating the walkthrough.
          </p>
        </div>

        {inProgress && <PipelineProgress projectId={projectId} />}

        {!inProgress && layout && (
          <FloorplanPreview rooms={floorplanRooms} roomNames={roomNames} />
        )}

        {!inProgress && roomsLoading && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
          </div>
        )}

        {!inProgress && rooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {rooms.map((room) => <RoomCard key={room.id} projectId={projectId} room={room} />)}
          </div>
        )}

        {!inProgress && (
          <div className="flex items-center justify-between border-t border-white/5 pt-6">
            <Button variant="outline" onClick={() => regenerate.mutate({ projectId })} disabled={regenerate.isPending}>
              <RefreshCw className="h-4 w-4" /> Re-run layout AI
            </Button>
            <Button size="lg" disabled={!ready} onClick={() => router.push(`/dashboard/projects/${projectId}/generate`)}>
              Continue to generate <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
