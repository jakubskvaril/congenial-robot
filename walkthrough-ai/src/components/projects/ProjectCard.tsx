'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Film, ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_BADGE, getProjectRoute } from '@/lib/status';
import type { GeneratedVideo, Project } from '@prisma/client';

type ProjectWithMeta = Project & {
  _count: { images: number; videos: number };
  videos: GeneratedVideo[];
};

export function ProjectCard({ project }: { project: ProjectWithMeta }) {
  const latestVideo = project.videos[0];

  return (
    <Link href={getProjectRoute(project)}>
      <Card className="group overflow-hidden transition-colors hover:border-primary/50">
        <div className="relative aspect-video bg-secondary">
          {latestVideo?.thumbnailUrl ? (
            <Image src={latestVideo.thumbnailUrl} alt={project.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
          {latestVideo?.status === 'COMPLETED' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <Film className="h-8 w-8 text-white" />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-medium">{project.name}</h3>
            <Badge variant={PROJECT_STATUS_BADGE[project.status]} className="shrink-0">
              {PROJECT_STATUS_LABEL[project.status]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {project._count.images} photos · {project._count.videos} video{project._count.videos === 1 ? '' : 's'}
          </p>
        </div>
      </Card>
    </Link>
  );
}
