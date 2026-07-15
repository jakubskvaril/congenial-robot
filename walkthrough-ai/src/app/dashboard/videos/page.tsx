'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';
import { Film } from 'lucide-react';

const STATUS_VARIANT = {
  QUEUED: 'secondary', PROCESSING: 'warning', COMPLETED: 'success', FAILED: 'destructive',
} as const;

export default function VideoHistoryPage() {
  const { data, isLoading } = trpc.video.history.useQuery({ limit: 30 });

  return (
    <div>
      <Topbar title="Video history" />
      <div className="p-6">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-video rounded-xl" />)}
          </div>
        )}

        {!isLoading && data?.videos.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center">
            <Film className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <h3 className="font-display text-lg font-medium">No videos yet</h3>
          </div>
        )}

        {!isLoading && data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.videos.map((video) => (
              <Link key={video.id} href={`/dashboard/projects/${video.projectId}/result`}>
                <Card className="overflow-hidden transition-colors hover:border-primary/50">
                  <div className="relative aspect-video bg-secondary">
                    {video.thumbnailUrl ? (
                      <Image src={video.thumbnailUrl} alt={video.project.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Film className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h3 className="line-clamp-1 text-sm font-medium">{video.project.name}</h3>
                      <Badge variant={STATUS_VARIANT[video.status]}>{video.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {video.provider} · {video.durationSeconds}s
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
