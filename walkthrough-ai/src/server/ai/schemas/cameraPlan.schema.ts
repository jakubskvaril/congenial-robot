import { z } from 'zod';

export const CameraStyleEnum = z.enum(['GIMBAL', 'DRONE', 'FPV', 'HANDHELD']);

const Shot = z.object({
  order: z.number().int(),
  roomTempId: z.string().describe('references a MergedRoom.tempId from the Layout'),
  roomName: z.string(),
  movement: z
    .string()
    .describe('professional real-estate cinematography move, e.g. "slow forward dolly", "orbiting reveal around kitchen island", "low rise from floor to eye-level"'),
  startFraming: z.string().describe('composition at shot start, e.g. "wide establishing shot from doorway"'),
  endFraming: z.string().describe('composition at shot end, e.g. "framed on the window view"'),
  durationSeconds: z.number().positive(),
  transitionToNext: z
    .string()
    .describe('how this shot connects to the next physically, e.g. "continues through the open archway into the kitchen" — must correspond to a real RoomConnection'),
});

/**
 * Agent 3 output. The camera path must only traverse edges that exist in
 * the Layout's room graph, in an order that forms a single continuous,
 * physically walkable path (or a small number of cuts at natural
 * boundaries, e.g. one cut from interior to garden). No teleporting
 * between non-adjacent rooms, no re-entering a room through a wall that
 * has no door/opening.
 */
export const CameraPlanSchema = z.object({
  cameraStyle: CameraStyleEnum,
  shots: z.array(Shot).min(1),
  totalDurationSeconds: z.number().positive(),
  reasoning: z
    .string()
    .describe('why this path/order was chosen, and confirmation every transition matches a real room connection'),
});

export type CameraPlanOutput = z.infer<typeof CameraPlanSchema>;
