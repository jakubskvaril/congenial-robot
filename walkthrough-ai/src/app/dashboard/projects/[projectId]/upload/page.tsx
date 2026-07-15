'use client';

import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Topbar } from '@/components/layout/Topbar';
import { Dropzone } from '@/components/upload/Dropzone';
import { ImageGrid } from '@/components/upload/ImageGrid';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';
import { Sparkles } from 'lucide-react';

export default function UploadPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: images, isLoading } = trpc.image.listByProject.useQuery({ projectId });

  const startAnalysis = trpc.project.startAnalysis.useMutation({
    onSuccess: () => {
      toast.success('Analyzing your photos…');
      router.push(`/dashboard/projects/${projectId}/rooms`);
    },
    onError: (err) => toast.error(err.message),
  });

  const count = images?.length ?? 0;
  const canAnalyze = count >= 5 && count <= 30;

  return (
    <div>
      <Topbar title="Upload photos" />
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Step 1 — Upload 5 to 30 photos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Include every room, the exterior, and any outdoor spaces (garden, pool, terrace). More
            angles per room help the AI merge duplicates and infer the floorplan more accurately.
          </p>
        </div>

        <Dropzone
          projectId={projectId}
          remainingSlots={30 - count}
          onUploaded={() => utils.image.listByProject.invalidate({ projectId })}
        />

        {isLoading && (
          <div className="grid grid-cols-4 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}
          </div>
        )}

        {!isLoading && images && images.length > 0 && <ImageGrid projectId={projectId} images={images} />}

        <div className="flex items-center justify-between border-t border-white/5 pt-6">
          <p className="text-sm text-muted-foreground">
            {count} / 30 photos {count < 5 && `— upload at least ${5 - count} more to continue`}
          </p>
          <Button
            size="lg"
            disabled={!canAnalyze || startAnalysis.isPending}
            onClick={() => startAnalysis.mutate({ projectId })}
          >
            <Sparkles className="h-4 w-4" />
            {startAnalysis.isPending ? 'Starting…' : 'Analyze property'}
          </Button>
        </div>
      </div>
    </div>
  );
}
