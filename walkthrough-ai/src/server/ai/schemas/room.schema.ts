import { z } from 'zod';

export const RoomTypeEnum = z.enum([
  'LIVING_ROOM',
  'BEDROOM',
  'KITCHEN',
  'BATHROOM',
  'DINING_ROOM',
  'HOME_OFFICE',
  'HALLWAY',
  'ENTRYWAY',
  'GARAGE',
  'GYM',
  'TERRACE',
  'BALCONY',
  'GARDEN',
  'POOL_AREA',
  'ROOFTOP',
  'VIEW_EXTERIOR',
  'OTHER',
]);

export const DesignStyleEnum = z.enum([
  'LUXURY',
  'MODERN',
  'MEDITERRANEAN',
  'SCANDINAVIAN',
  'MINIMAL',
  'COZY',
  'OTHER',
]);

const FurnitureItem = z.object({
  name: z.string().describe('e.g. "king bed", "L-shaped sofa", "kitchen island"'),
  material: z.string().optional(),
  color: z.string().optional(),
  position: z
    .string()
    .describe('approximate position in the room, e.g. "against the north wall, centered"'),
});

const WindowPlacement = z.object({
  wall: z.string().describe('e.g. "east wall", "facing the garden"'),
  sizeEstimate: z.string().describe('e.g. "floor-to-ceiling", "standard 1.2m x 1.5m"'),
  view: z.string().optional().describe('what is visible through it, if anything'),
});

const DoorPlacement = z.object({
  wall: z.string(),
  type: z.string().describe('e.g. "swing door", "sliding glass door", "archway"'),
  leadsTo: z
    .string()
    .optional()
    .describe('best guess of what room/space this door leads to, based on visual cues'),
});

/**
 * Agent 1 output — one row per uploaded photo. This is a pure extraction
 * task: the model must describe only what is visible, never infer rooms
 * or objects that aren't shown. Confidence fields let Agent 2 and the
 * review UI flag low-certainty extractions for user confirmation.
 */
export const RoomAnalysisSchema = z.object({
  roomType: RoomTypeEnum,
  roomTypeConfidence: z.number().min(0).max(1),
  style: DesignStyleEnum,
  dimensionsEstimate: z.object({
    widthMeters: z.number().nullable(),
    lengthMeters: z.number().nullable(),
    ceilingHeightMeters: z.number().nullable(),
    confidence: z.number().min(0).max(1),
  }),
  materials: z.object({
    flooring: z.string(),
    walls: z.string(),
    ceiling: z.string(),
    countertops: z.string().nullable(),
    notableFinishes: z.array(z.string()).default([]),
  }),
  furniture: z.array(FurnitureItem),
  windowPlacement: z.array(WindowPlacement),
  doorPlacement: z.array(DoorPlacement),
  lighting: z.object({
    naturalLight: z.string().describe('e.g. "abundant, south-facing", "dim, single small window"'),
    fixtures: z.array(z.string()),
    colorTemperature: z.string().describe('e.g. "warm 2700K", "cool daylight"'),
    apparentTimeOfDay: z.string().describe('e.g. "golden hour", "midday", "overcast", "evening interior lighting"'),
  }),
  outdoorVisibility: z.boolean(),
  outdoorFeatures: z
    .object({
      hasPool: z.boolean(),
      hasGarden: z.boolean(),
      hasTerrace: z.boolean(),
      viewDescription: z.string().nullable(),
    })
    .nullable(),
  distinguishingFeatures: z
    .array(z.string())
    .describe('unique visual markers useful for de-duplicating this room across multiple photos, e.g. "blue accent wall", "brass pendant light over island"'),
});

export type RoomAnalysisOutput = z.infer<typeof RoomAnalysisSchema>;
