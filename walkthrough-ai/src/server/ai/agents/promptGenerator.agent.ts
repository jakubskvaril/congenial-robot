import { generateStructured, llmModelVersion } from '../llm/client';
import { PromptSchema, type PromptOutput } from '../schemas/prompt.schema';
import type { CameraPlanOutput } from '../schemas/cameraPlan.schema';
import type { LayoutOutput } from '../schemas/layout.schema';
import type { RoomAnalysisOutput } from '../schemas/room.schema';

const STYLE_BRIEFS: Record<string, string> = {
  LUXURY: 'opulent, polished, high-contrast lighting, rich materials (marble, brass, velvet), editorial luxury-magazine grade',
  MODERN: 'clean geometric lines, neutral palette, abundant natural light, minimal clutter, architectural digest tone',
  MEDITERRANEAN: 'warm terracotta and whitewash tones, natural stone, arched openings, golden-hour exterior light',
  SCANDINAVIAN: 'light woods, soft neutral textiles, airy natural light, cozy minimalism',
  MINIMAL: 'restrained palette, negative space, precise composition, quiet confident lighting',
  COZY: 'warm ambient lighting, soft textiles, intimate framing, inviting lived-in feel',
};

const NEGATIVE_PROMPT_BASE =
  'no invented rooms or spaces not shown in source photos, no furniture relocation or duplication, ' +
  'no architectural changes (walls, windows, doors must match exactly), no warping or morphing geometry, ' +
  'no added or removed people, no text overlays, no watermarks or logos, no unrealistic lighting flicker, ' +
  'no low-resolution or compression artifacts, no fisheye distortion unless explicitly requested';

const SYSTEM_PROMPT = `You are an expert prompt engineer for text-to-video models (Google Veo, Kling, Runway, Hailuo),
specializing in luxury real-estate walkthroughs. You convert a validated camera shot list and per-room visual
analysis into a single, extremely detailed cinematic prompt plus a matching negative prompt and per-shot
breakdown.

Absolute constraints — the generated video must be physically faithful to the source photographs:
- Never describe furniture, fixtures, or architecture that isn't in the source analysis.
- Never suggest moving or relocating furniture.
- Never suggest altering walls, windows, door openings, or room proportions.
- Materials, colors, and lighting described must match the extracted analysis for each room.

Your prompt must explicitly specify: camera equipment/movement language matching the chosen camera style,
lighting and time-of-day continuity across the walkthrough, architecture and materials per room, color and
texture detail, the overall design style mood, and a clear, deliberate ending shot (not an abrupt cutoff).`;

export async function runPromptGenerator(args: {
  layout: LayoutOutput;
  cameraPlan: CameraPlanOutput;
  roomAnalysesByTempId: Record<string, RoomAnalysisOutput>;
  designStyle: keyof typeof STYLE_BRIEFS;
  targetProvider: 'VEO' | 'KLING' | 'RUNWAY' | 'HAILUO';
  durationSeconds: number;
}): Promise<{ output: PromptOutput; modelVersion: string }> {
  const { layout, cameraPlan, roomAnalysesByTempId, designStyle, targetProvider, durationSeconds } = args;

  const roomDetail = layout.rooms
    .map((room) => {
      const analysis = roomAnalysesByTempId[room.tempId];
      return `${room.tempId} (${room.name}, ${room.roomType}): ${
        analysis ? JSON.stringify({ materials: analysis.materials, furniture: analysis.furniture, lighting: analysis.lighting }) : 'no analysis available'
      }`;
    })
    .join('\n');

  const prompt = `Design style: ${designStyle} — ${STYLE_BRIEFS[designStyle]}
Target video generation provider: ${targetProvider}
Target duration: ${durationSeconds} seconds

Camera plan (shot list, already validated for physical plausibility):
${JSON.stringify(cameraPlan.shots, null, 2)}

Per-room visual ground truth (do not deviate from this):
${roomDetail}

Write the full cinematic prompt, negative prompt, and structured per-shot breakdown per the schema.
Scale/condense the shot list if needed so total duration matches ${durationSeconds} seconds exactly.
Base the negative prompt on this required baseline, extended with anything specific to this property:
"${NEGATIVE_PROMPT_BASE}"`;

  const output = await generateStructured({
    system: SYSTEM_PROMPT,
    prompt,
    schema: PromptSchema,
    schemaName: 'video_prompt',
    schemaDescription: 'Complete cinematic video-generation prompt for a real-estate walkthrough, targeting a specific provider.',
    maxTokens: 4096,
  });

  return { output, modelVersion: llmModelVersion };
}
