'use client';

import { trpc } from '@/lib/trpc/client';
import { isProjectInProgress } from '@/lib/status';
import { Progress } from '@/components/ui/progress';
import { Check, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectStatus } from '@prisma/client';

interface Stage {
  key: ProjectStatus[];
  label: string;
}

const STAGE_GROUPS: Stage[] = [
  { key: ['ANALYZING'], label: 'Analyzing photos (Agent 1)' },
  { key: ['BUILDING_LAYOUT'], label: 'Building room layout (Agent 2)' },
  { key: ['PLANNING_CAMERA'], label: 'Planning camera path (Agent 3)' },
  { key: ['GENERATING_PROMPT'], label: 'Writing cinematic prompt (Agent 4)' },
  { key: ['GENERATING_VIDEO'], label: 'Generating video (Agent 5)' },
];

const STAGE_ORDER: ProjectStatus[] = [
  'DRAFT', 'UPLOADING', 'ANALYZING', 'ANALYZED', 'BUILDING_LAYOUT', 'LAYOUT_READY',
  'PLANNING_CAMERA', 'GENERATING_PROMPT', 'PROMPT_READY', 'GENERATING_VIDEO', 'COMPLETED',
];

export function PipelineProgress({ projectId }: { projectId: string }) {
  const { data } = trpc.job.statusByProject.useQuery(
    { projectId },
    { refetchInterval: (query) => (isProjectInProgress(query.state.data?.projectStatus ?? 'DRAFT') ? 2500 : false) },
  );

  if (!data) return null;
  const { projectStatus } = data;
  const currentIndex = STAGE_ORDER.indexOf(projectStatus);
  const failed = projectStatus === 'FAILED';

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-5">
      {STAGE_GROUPS.map((stage) => {
        const stageIndex = STAGE_ORDER.indexOf(stage.key[0]!);
        const isDone = currentIndex > stageIndex && !failed;
        const isActive = stage.key.includes(projectStatus);
        const isPending = currentIndex < stageIndex;

        return (
          <div key={stage.label} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
                isDone && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400',
                isActive && !failed && 'border-primary/40 bg-primary/15 text-primary',
                isPending && 'border-white/10 text-muted-foreground',
                failed && isActive && 'border-destructive/40 bg-destructive/15 text-destructive',
              )}
            >
              {isDone && <Check className="h-3.5 w-3.5" />}
              {isActive && !failed && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isActive && failed && <XCircle className="h-3.5 w-3.5" />}
            </div>
            <span className={cn('text-sm', isPending ? 'text-muted-foreground' : 'text-foreground')}>
              {stage.label}
            </span>
          </div>
        );
      })}
      <Progress
        value={failed ? 100 : ((currentIndex + 1) / STAGE_ORDER.length) * 100}
        indicatorClassName={failed ? 'bg-destructive' : undefined}
      />
    </div>
  );
}
