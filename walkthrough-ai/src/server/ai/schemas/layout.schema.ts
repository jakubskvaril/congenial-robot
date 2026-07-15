import { z } from 'zod';
import { RoomTypeEnum } from './room.schema';

export const ConnectionTypeEnum = z.enum([
  'DOOR',
  'OPEN_ARCHWAY',
  'HALLWAY',
  'STAIRCASE',
  'OPEN_PLAN',
  'OUTDOOR_TRANSITION',
  'SLIDING_DOOR',
]);

const MergedRoom = z.object({
  tempId: z.string().describe('stable temp id used to reference this room in connections/floorplan, e.g. "room_1"'),
  name: z.string().describe('human-readable label, e.g. "Master Bedroom", "Garden Terrace"'),
  roomType: RoomTypeEnum,
  memberImageIds: z
    .array(z.string())
    .min(1)
    .describe('ids of the source images that show this same physical room'),
  primaryImageId: z
    .string()
    .describe('the single best establishing-shot image id among memberImageIds'),
  order: z.number().int().describe('suggested position in the walkthrough sequence, 0-indexed'),
});

const RoomEdge = z.object({
  fromTempId: z.string(),
  toTempId: z.string(),
  connectionType: ConnectionTypeEnum,
  confidence: z.number().min(0).max(1),
});

const FloorplanRoom = z.object({
  tempId: z.string(),
  x: z.number().describe('relative x position, arbitrary unit grid, 0-100'),
  y: z.number().describe('relative y position, arbitrary unit grid, 0-100'),
  width: z.number().describe('relative width, arbitrary unit grid'),
  height: z.number().describe('relative height, arbitrary unit grid'),
});

/**
 * Agent 2 output. Given every Agent-1 RoomAnalysis in a project, this
 * agent must (a) deduplicate photos of the same physical room using
 * distinguishingFeatures/materials/furniture overlap, (b) infer a
 * plausible adjacency graph from door/window placements and visual
 * continuity cues, and (c) propose a rough relative floorplan. It must
 * never invent a room with zero supporting photos.
 */
export const LayoutSchema = z.object({
  rooms: z.array(MergedRoom).min(1),
  connections: z.array(RoomEdge),
  floorplanEstimate: z.object({
    units: z.literal('relative'),
    rooms: z.array(FloorplanRoom),
  }),
  reasoning: z
    .string()
    .describe('explanation of grouping decisions, ambiguous cases, and adjacency inference'),
});

export type LayoutOutput = z.infer<typeof LayoutSchema>;
