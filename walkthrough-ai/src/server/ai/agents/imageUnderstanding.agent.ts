import { generateStructured, llmModelVersion, type ImageInput } from '../llm/client';
import { RoomAnalysisSchema, type RoomAnalysisOutput } from '../schemas/room.schema';

const SYSTEM_PROMPT = `You are a computer-vision analyst for a luxury real-estate cinematography studio.
You examine a single photograph of a property and extract a precise, literal structured description
of exactly what is visible.

Hard rules — violating any of these makes your output unusable:
1. Describe ONLY what is visible in this photograph. Never infer rooms, furniture, or architecture
   that isn't shown.
2. Do not guess exact measurements as fact — dimension estimates must reflect genuine visual
   uncertainty via the confidence field, and use null when you cannot form any reasonable estimate.
3. Distinguishing features must be concrete and re-identifiable (specific colors, materials, fixtures,
   art, textiles) so this room can later be matched against other photos of the same physical space.
4. If the image shows an exterior/outdoor space (garden, pool, terrace, view), still classify a
   roomType (use the outdoor-appropriate enum value) and set outdoorVisibility/outdoorFeatures precisely.`;

export async function runImageUnderstanding(image: ImageInput): Promise<{
  output: RoomAnalysisOutput;
  modelVersion: string;
}> {
  const output = await generateStructured({
    system: SYSTEM_PROMPT,
    prompt:
      'Analyze this property photograph and extract the full structured description per the schema. ' +
      'Be literal and conservative — when uncertain, say so via the confidence fields rather than guessing.',
    images: [image],
    schema: RoomAnalysisSchema,
    schemaName: 'room_analysis',
    schemaDescription: 'Structured extraction of everything visible in a single real-estate photograph.',
    maxTokens: 2048,
  });

  return { output, modelVersion: llmModelVersion };
}
