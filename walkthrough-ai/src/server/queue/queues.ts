import { Queue } from 'bullmq';
import { bullConnection } from './connection';
import type { VideoProviderName } from '../ai/video-providers/types';
import type { CameraStyle, DesignStyle } from '@prisma/client';

export const QUEUE_NAMES = {
  IMAGE_ANALYSIS: 'image-analysis',
  LAYOUT_BUILD: 'layout-build',
  CAMERA_PLAN: 'camera-plan',
  PROMPT_GENERATION: 'prompt-generation',
  VIDEO_GENERATION: 'video-generation',
  VIDEO_POLL: 'video-poll', // safety-net poller for missed webhooks
} as const;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
  removeOnFail: { age: 60 * 60 * 24 * 7 },
};

export interface ImageAnalysisJobData {
  projectId: string;
  imageId: string;
  jobId: string; // our Job row id, for progress tracking
}

export interface LayoutBuildJobData {
  projectId: string;
  jobId: string;
}

export interface CameraPlanJobData {
  projectId: string;
  layoutId: string;
  jobId: string;
  cameraStyle: CameraStyle;
  designStyle: DesignStyle;
  targetProvider: VideoProviderName;
  durationSeconds: number;
}

export interface PromptGenerationJobData {
  projectId: string;
  cameraPlanId: string;
  jobId: string;
  designStyle: DesignStyle;
  targetProvider: VideoProviderName;
  durationSeconds: number;
}

export interface VideoGenerationJobData {
  projectId: string;
  promptId: string;
  generatedVideoId: string;
  jobId: string;
  provider: VideoProviderName;
}

export interface VideoPollJobData {
  generatedVideoId: string;
}

export const imageAnalysisQueue = new Queue<ImageAnalysisJobData>(QUEUE_NAMES.IMAGE_ANALYSIS, {
  connection: bullConnection,
  defaultJobOptions,
});

export const layoutBuildQueue = new Queue<LayoutBuildJobData>(QUEUE_NAMES.LAYOUT_BUILD, {
  connection: bullConnection,
  defaultJobOptions,
});

export const cameraPlanQueue = new Queue<CameraPlanJobData>(QUEUE_NAMES.CAMERA_PLAN, {
  connection: bullConnection,
  defaultJobOptions,
});

export const promptGenerationQueue = new Queue<PromptGenerationJobData>(QUEUE_NAMES.PROMPT_GENERATION, {
  connection: bullConnection,
  defaultJobOptions,
});

export const videoGenerationQueue = new Queue<VideoGenerationJobData>(QUEUE_NAMES.VIDEO_GENERATION, {
  connection: bullConnection,
  defaultJobOptions: { ...defaultJobOptions, attempts: 2 },
});

export const videoPollQueue = new Queue<VideoPollJobData>(QUEUE_NAMES.VIDEO_POLL, {
  connection: bullConnection,
  defaultJobOptions: { attempts: 1, removeOnComplete: true, removeOnFail: true },
});
