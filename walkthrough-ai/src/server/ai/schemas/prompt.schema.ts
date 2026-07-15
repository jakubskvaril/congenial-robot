import { z } from 'zod';
import { DesignStyleEnum } from './room.schema';

export const VideoProviderNameEnum = z.enum(['VEO', 'KLING', 'RUNWAY', 'HAILUO']);

const ShotPrompt = z.object({
  order: z.number().int(),
  roomName: z.string(),
  durationSeconds: z.number().positive(),
  cameraDescription: z.string().describe('camera + lens + movement language for this shot'),
  sceneDescription: z.string().describe('accurate physical description: furniture, materials, colors, light — no invention'),
  transition: z.string(),
});

/**
 * Agent 4 output. `promptText` is the single flowing cinematic prompt
 * sent to the video model; `structuredShots` is the same content
 * decomposed per-shot so provider adapters that accept multi-shot /
 * storyboard inputs (rather than one long prompt) can use it directly.
 */
export const PromptSchema = z.object({
  designStyle: DesignStyleEnum,
  targetProvider: VideoProviderNameEnum,
  durationSeconds: z.number().positive(),
  promptText: z
    .string()
    .describe('complete cinematic prompt: camera, movement, lighting, architecture, materials, colors, textures, style, ending — in flowing natural language'),
  negativePrompt: z
    .string()
    .describe('explicit exclusions: no invented rooms, no furniture relocation/duplication, no architectural changes, no warping, no extra people, no text overlays, no logo artifacts'),
  structuredShots: z.array(ShotPrompt).min(1),
});

export type PromptOutput = z.infer<typeof PromptSchema>;
