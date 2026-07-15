'use client';

import { Topbar } from '@/components/layout/Topbar';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc/client';
import { Building2 } from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading } = trpc.project.list.useQuery({ limit: 24 });

  return (
    <div>
      <Topbar title="Projects" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Every property you&apos;ve uploaded, with its walkthrough status.
          </p>
          <NewProjectDialog />
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && data?.projects.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24 text-center">
            <Building2 className="mb-4 h-10 w-10 text-muted-foreground/40" />
            <h3 className="font-display text-lg font-medium">No projects yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first project and upload 5–30 photos to generate a cinematic walkthrough.
            </p>
          </div>
        )}

        {!isLoading && data && data.projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
