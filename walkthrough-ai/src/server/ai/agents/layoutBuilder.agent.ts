import { generateStructured, llmModelVersion, type ImageInput } from '../llm/client';
import { LayoutSchema, type LayoutOutput } from '../schemas/layout.schema';
import type { RoomAnalysisOutput } from '../schemas/room.schema';

export interface AnalyzedImage {
  imageId: string;
  image: ImageInput;
  analysis: RoomAnalysisOutput;
}

const SYSTEM_PROMPT = `You are a spatial-reasoning agent for a luxury real-estate cinematography studio.
You receive every photograph uploaded for one property, along with a per-photo structured analysis
already extracted by a vision model. Your job is purely organizational, not creative:

1. Deduplicate: group photos that show the SAME physical room into a single merged room, using
   distinguishingFeatures, materials, furniture and visual continuity across photos as evidence.
2. Order: propose a sensible walkthrough sequence (typically: approach/exterior -> entryway ->
   living spaces -> private spaces -> outdoor amenities), but the sequence MUST only reflect rooms
   that actually exist in the photos.
3. Connect: infer which rooms are physically adjacent/connected, using door/window placements,
   sightlines, and matching architectural cues (e.g. the same hallway visible from two rooms).
   Only propose a connection when there is real visual or logical evidence for it.
4. Floorplan: propose a rough RELATIVE floorplan layout (arbitrary 0-100 grid units) consistent
   with the connections you inferred. This is illustrative, not to scale.

Never invent a room that has no supporting photo. Never merge two rooms that are visually distinct
just to simplify the walkthrough — under-merging is safer than over-merging.`;

export async function runLayoutBuilder(images: AnalyzedImage[]): Promise<{
  output: LayoutOutput;
  modelVersion: string;
}> {
  const analysisContext = images
    .map(
      ({ imageId, analysis }) =>
        `Image ${imageId}: roomType=${analysis.roomType} (confidence ${analysis.roomTypeConfidence}), ` +
        `style=${analysis.style}, distinguishingFeatures=${JSON.stringify(analysis.distinguishingFeatures)}, ` +
        `materials=${JSON.stringify(analysis.materials)}, doors=${JSON.stringify(analysis.doorPlacement)}, ` +
        `windows=${JSON.stringify(analysis.windowPlacement)}, outdoorVisibility=${analysis.outdoorVisibility}`,
    )
    .join('\n');

  const output = await generateStructured({
    system: SYSTEM_PROMPT,
    prompt:
      `Here are the per-photo analyses for ${images.length} photographs of one property:\n\n${analysisContext}\n\n` +
      'Each corresponding photograph is attached in the same order as listed above (image ids given for reference). ' +
      'Build the merged room graph, walkthrough order, connections, and relative floorplan per the schema. ' +
      'Reference images strictly by the imageId strings given above in memberImageIds/primaryImageId.',
    images: images.map((i) => i.image),
    schema: LayoutSchema,
    schemaName: 'layout',
    schemaDescription: 'Merged room graph, adjacency connections, and relative floorplan for one property.',
    maxTokens: 8192,
  });

  return { output, modelVersion: llmModelVersion };
}
