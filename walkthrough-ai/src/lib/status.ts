import type { ProjectStatus } from '@prisma/client';

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'Draft',
  UPLOADING: 'Uploading',
  ANALYZING: 'Analyzing photos',
  ANALYZED: 'Analysis complete',
  BUILDING_LAYOUT: 'Building layout',
  LAYOUT_READY: 'Ready to generate',
  PLANNING_CAMERA: 'Planning camera path',
  GENERATING_PROMPT: 'Writing prompt',
  PROMPT_READY: 'Prompt ready',
  GENERATING_VIDEO: 'Generating video',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export const PROJECT_STATUS_BADGE: Record<ProjectStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  DRAFT: 'outline',
  UPLOADING: 'secondary',
  ANALYZING: 'warning',
  ANALYZED: 'secondary',
  BUILDING_LAYOUT: 'warning',
  LAYOUT_READY: 'success',
  PLANNING_CAMERA: 'warning',
  GENERATING_PROMPT: 'warning',
  PROMPT_READY: 'secondary',
  GENERATING_VIDEO: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
};

const IN_PROGRESS_STATUSES: ProjectStatus[] = [
  'ANALYZING', 'BUILDING_LAYOUT', 'PLANNING_CAMERA', 'GENERATING_PROMPT', 'GENERATING_VIDEO',
];

export function isProjectInProgress(status: ProjectStatus): boolean {
  return IN_PROGRESS_STATUSES.includes(status);
}

/** Routes the user to whichever step of the flow their project is currently at. */
export function getProjectRoute(project: { id: string; status: ProjectStatus }): string {
  const base = `/dashboard/projects/${project.id}`;
  switch (project.status) {
    case 'DRAFT':
    case 'UPLOADING':
      return `${base}/upload`;
    case 'ANALYZING':
    case 'ANALYZED':
    case 'BUILDING_LAYOUT':
    case 'LAYOUT_READY':
      return `${base}/rooms`;
    case 'PLANNING_CAMERA':
    case 'GENERATING_PROMPT':
    case 'PROMPT_READY':
      return `${base}/generate`;
    case 'GENERATING_VIDEO':
    case 'COMPLETED':
    case 'FAILED':
      return `${base}/result`;
    default:
      return base;
  }
}
