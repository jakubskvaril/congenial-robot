import { generateStructured, llmModelVersion } from '../llm/client';
import { CameraPlanSchema, type CameraPlanOutput } from '../schemas/cameraPlan.schema';
import type { LayoutOutput } from '../schemas/layout.schema';

const CAMERA_STYLE_BRIEFS: Record<string, string> = {
  GIMBAL: 'Smooth, stabilized handheld-gimbal moves — gentle dolly-ins, slow lateral pans, subtle floating reveals. The gold standard of luxury real-estate video.',
  DRONE: 'Aerial and near-aerial perspectives for exteriors and grand interior atriums; sweeping establishing shots, slow orbits around the building, rising reveals over gardens/pools.',
  FPV: 'Fast, energetic first-person-view flythrough with continuous unbroken motion diving through doorways and openings — high-energy, modern, best for dynamic properties.',
  HANDHELD: 'Natural, slightly imperfect handheld motion for an intimate, editorial, lifestyle-magazine feel — subtle sway, walking pace.',
};

const SYSTEM_PROMPT = `You are a professional real-estate cinematographer planning a single continuous walkthrough shot list.
You are given a room graph: merged rooms, their relative floorplan positions, and the physical connections
between them (doors, archways, hallways, staircases, open-plan boundaries, outdoor transitions).

Hard physical-plausibility rules:
1. The camera may only move from one room to another across an edge that exists in the connection graph.
   Never cut/move between rooms that have no connection.
2. Never teleport: every transition must be described as continuous camera motion through the connecting
   architectural feature (the actual door/archway/opening), or an intentional, clearly-motivated cut at a
   natural boundary (e.g. interior to exterior).
3. Respect the requested camera style's real cinematographic vocabulary — do not mix in moves that style
   wouldn't use.
4. Order shots to form one coherent path across the room graph (a walkable route), prioritizing showing
   the property's best features (kitchen, primary bedroom, outdoor amenities) without backtracking through
   the same room twice unless the floorplan requires it.
5. Total duration across all shots must equal the requested total duration.`;

export async function runCameraPlanner(args: {
  layout: LayoutOutput;
  cameraStyle: 'GIMBAL' | 'DRONE' | 'FPV' | 'HANDHELD';
  totalDurationSeconds: number;
}): Promise<{ output: CameraPlanOutput; modelVersion: string }> {
  const { layout, cameraStyle, totalDurationSeconds } = args;

  const prompt = `Camera style: ${cameraStyle} — ${CAMERA_STYLE_BRIEFS[cameraStyle]}
Requested total duration: ${totalDurationSeconds} seconds.

Room graph (rooms):
${JSON.stringify(layout.rooms, null, 2)}

Connections (edges — the ONLY paths the camera may travel between rooms):
${JSON.stringify(layout.connections, null, 2)}

Relative floorplan:
${JSON.stringify(layout.floorplanEstimate, null, 2)}

Plan the full shot list per the schema. Reference rooms by their tempId in roomTempId.`;

  const output = await generateStructured({
    system: SYSTEM_PROMPT,
    prompt,
    schema: CameraPlanSchema,
    schemaName: 'camera_plan',
    schemaDescription: 'Physically-valid, ordered camera shot list for a real-estate walkthrough video.',
    maxTokens: 4096,
  });

  return { output, modelVersion: llmModelVersion };
}
