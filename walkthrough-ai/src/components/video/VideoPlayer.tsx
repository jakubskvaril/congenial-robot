'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GeneratedVideo } from '@prisma/client';

export function VideoPlayer({ video }: { video: GeneratedVideo }) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
        {video.videoUrl ? (
          <video src={video.videoUrl} poster={video.thumbnailUrl ?? undefined} controls className="w-full" />
        ) : (
          <div className="flex aspect-video items-center justify-center text-muted-foreground">
            Video not available
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {video.provider} · {video.durationSeconds}s {video.resolution ? `· ${video.resolution}` : ''}
        </span>
        {video.videoUrl && (
          <Button size="sm" variant="outline" asChild>
            <a href={video.videoUrl} download target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" /> Download
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
