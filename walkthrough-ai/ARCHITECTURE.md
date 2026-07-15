# Walkthrough AI — Architecture

This document explains the reasoning behind every major decision in this codebase. It is written for
an engineer picking up the project cold.

## 1. Why five agents instead of one prompt

A single LLM call that goes from "here are 20 photos" to "here is a video prompt" fails in a specific,
predictable way: it starts inventing things. It merges rooms that aren't the same, proposes camera
moves through walls that don't have doors, and drifts on materials/colors between shots. The failure
mode isn't "bad prose," it's **physical inaccuracy in a product where physical accuracy is the entire
value proposition** — a real-estate video that shows a pool that doesn't exist is worse than no video.

Splitting the pipeline into five agents, each with a narrow job and a hard-validated output schema,
constrains where hallucination can enter:

| Agent | Input | Output | What it's NOT allowed to do |
|---|---|---|---|
| 1. Image Understanding | one photo | structured room description (Zod-validated) | infer anything not visible in that photo |
| 2. Layout Builder | all Agent-1 outputs + photos | merged room graph + floorplan | invent a room with zero supporting photos |
| 3. Camera Planner | room graph (with real connections) | ordered shot list | move the camera across a non-existent connection |
| 4. Prompt Generator | shot list + room ground truth | cinematic prompt + negative prompt | describe furniture/materials not in the ground truth |
| 5. Video Generator | prompt + reference images | provider job handle | (pure infrastructure — no creative latitude) |

Each agent's output is **persisted as its own row** (`RoomAnalysis`, `Layout`, `CameraPlan`, `Prompt`,
`GeneratedVideo`), not merged into one mutable "project state" blob. Two consequences fall out of this:

- **Regeneration is cheap and non-destructive.** Re-running the Camera Planner with a new camera style
  creates a new `CameraPlan` row referencing the same `Layout` — it doesn't touch the Layout or the
  RoomAnalyses upstream of it. The user can iterate on styling without re-paying for re-analysis.
- **Full audit trail.** Every `GeneratedVideo` traces back through `Prompt → CameraPlan → Layout →
  RoomAnalysis → ProjectImage`. If a customer says "why did it put the pool in the wrong place," we can
  read the exact chain of AI decisions that produced that output.

## 2. Structured outputs via forced tool-use, not "return JSON"

`src/server/ai/llm/client.ts` implements every agent call as an Anthropic tool-use request with
`tool_choice: { type: 'tool', name: <schema> }`, where the tool's `input_schema` is generated from the
agent's Zod schema (`zod-to-json-schema`). This is deliberately different from prompting "respond with
JSON matching this format" and regex-extracting it from prose:

- Forced tool-use is validated against a schema by the model provider before it's even returned to us.
- We still re-validate with `schema.safeParse` in `generateStructured` — belt and suspenders — so a
  provider-side schema drift fails loudly (a thrown error visible in the Job's `error` field) instead
  of silently writing malformed JSON into the database.
- Every schema (`room.schema.ts`, `layout.schema.ts`, `cameraPlan.schema.ts`, `prompt.schema.ts`) has
  the "never invent" constraint written directly into field descriptions, which Claude sees as part of
  the tool's JSON schema — the constraint travels with the data contract, not just the system prompt.

## 3. Job execution model: BullMQ + Postgres, not a single long request

Video generation pipelines are minutes-long and multi-stage; running them inline in a Next.js API
route (serverless, with request timeouts) would be actively hostile to this workload. Instead:

- **BullMQ (Redis-backed) queues** (`src/server/queue/queues.ts`) own retries, backoff, and concurrency
  per stage. Each stage is its own queue so, e.g., a burst of image-analysis jobs doesn't starve video
  generation for other users.
- **Fan-in, not fan-out, for image analysis → layout.** Agent 1 runs once per photo (parallelizable,
  `concurrency: 8`). Agent 2 must see *all* of them at once. `imageAnalysis.worker.ts` checks after
  each completion whether the project's image count has hit zero-remaining, and only then enqueues
  the single Layout Build job — this avoids either a wasteful polling loop or a fragile "wait for N
  callbacks" counter kept in application memory (which wouldn't survive a worker restart; Postgres is
  the source of truth for "how many images still need analysis").
- **Linear chaining for stages 3→4→5.** Once the user hits "Generate," Camera Plan → Prompt Generation
  → Video Generation is a strict pipeline (each needs the previous stage's output), so each worker
  enqueues the next stage directly from its own completion handler rather than using a generic
  workflow/flow engine — simpler to read, and the one-directional data dependency doesn't need a DAG.
- **`Job` rows mirror BullMQ jobs 1:1** (`Job.queueJobId`) purely for product-facing status (the
  generation-progress UI polls `job.statusByProject`, not Redis directly) and for audit history that
  survives BullMQ's `removeOnComplete` cleanup.
- **Workers run as a separate process** (`npm run worker`, `src/server/queue/workers/index.ts`), never
  imported into a Next.js route handler. This is the difference between "job survives a serverless
  function timeout" and "job dies with the request."

## 4. Credits: denormalized balance + append-only ledger

`User.creditBalance` is what every read path uses (fast, no aggregation). `CreditLedgerEntry` is
append-only and is the actual source of truth — `balanceAfter` on each entry lets us audit drift at
any point without replaying the whole history. The two are only ever written together, inside a
`db.$transaction`, in three places: `pipeline.orchestrator.ts` (debit on generation start, refund on
failure), the Stripe webhook (subscription grants), and `admin.adjustCredits` (manual support
adjustments, which also writes an `AuditLog` row).

Credits are **reserved before generation starts**, not charged on completion. This is intentional: we
know the concrete cost the moment we know provider + duration
(`VideoProvider.estimateCostCredits`), and reserving upfront means we never generate a video whose
credit we can't collect, and never leave a user's balance in an ambiguous "maybe charged" state while
a multi-minute async job is in flight. `refundGenerationCredits` is the single choke point for putting
credits back if any stage after reservation fails.

## 5. Video provider abstraction (Agent 5)

`VideoProvider` (`src/server/ai/video-providers/types.ts`) is intentionally the thinnest interface that
still supports every provider's actual shape: `submit`, `checkStatus` (poll fallback), and
`parseWebhook` (the primary completion path). Adding Sora, or whatever ships next, means one new file
in `providers/` and one line in `registry.ts` — nothing in the queue, routers, or UI changes, because
they only ever talk to the `VideoProvider` interface, never to a specific provider's SDK.

Completion has two independent paths that both funnel into the same function
(`videoResult.service.ts#applyVideoGenerationResult`), so the logic for "what does COMPLETED/FAILED
mean for the DB and for credits" exists in exactly one place:

1. **Webhook** (`/api/webhooks/video-provider`) — the fast path, when the provider's callback fires.
2. **Poller** (`videoPoll.worker.ts`) — a BullMQ job scheduled 90s after submission with exponential
   backoff up to 20 attempts, as a safety net for missed/delayed webhooks. Both paths are idempotent
   (`applyVideoGenerationResult` no-ops if the video is already terminal), so whichever arrives first
   wins and the other is a harmless no-op.

## 6. Data model shape (see `prisma/schema.prisma` for full detail)

- **Every pipeline stage owns a versionable table**, not a shared mutable blob — see §1.
- **`Room` vs `ProjectImage`**: a `Room` is Agent 2's inferred *physical* room; `ProjectImage` is a
  *photo*. The `RoomImage` join table is what lets 3 photos of the same living room collapse into one
  `Room` with one `primaryImageId` used for downstream prompt/video generation.
- **`RoomConnection` is a directed graph edge** with a `ConnectionType` (door, archway, hallway,
  staircase, open-plan, outdoor transition, sliding door) — this is what Agent 3 is constrained to walk
  across, and what the floorplan/room-graph editor lets users manually correct
  (`room.createConnection` / `room.updateConnection`, both flip `isUserEdited: true` so a future
  layout regeneration doesn't silently overwrite a user's correction without them noticing... in the
  current implementation regeneration does still replace the whole room/connection set for simplicity;
  a production hardening pass would diff and preserve `isUserEdited: true` rows across regenerations).
- **Identity**: Clerk owns auth; `User` is a webhook-synced projection (`/api/webhooks/clerk`). No
  password/session logic lives in this codebase at all.

## 7. Frontend architecture

- **tRPC end-to-end typed API**, no REST layer to keep in sync with the client by hand. Procedures are
  split by domain (`project`, `image`, `room`, `layout`, `prompt`, `video`, `job`, `credit`, `billing`,
  `admin`) mirroring the Prisma models, not by page — this keeps the API reusable if/when a mobile app
  or public API v2 needs the same operations.
- **Polling over websockets for pipeline progress.** `job.statusByProject` is polled via React Query's
  `refetchInterval` (2.5–3s, only while `isProjectInProgress`). For a pipeline where stages take tens
  of seconds to minutes, this is simpler and more operationally robust than a websocket/SSE layer, at
  the cost of being a poor fit if sub-second progress granularity is ever required — that's the
  documented tradeoff, not an oversight.
- **Design system**: hand-rolled shadcn/ui-style primitives (`src/components/ui`) on Radix + Tailwind,
  not the shadcn CLI output verbatim, so the exact set of primitives matches what the app actually
  uses. Dark theme is the default and the primary designed experience (CSS variables in
  `globals.css`); light theme exists via the same variables for completeness but luxury/premium
  positioning is dark-first, matching the Midjourney/Linear/Cursor reference points in the brief.

## 8. What's deliberately out of scope / left as a hardening TODO

This is a complete, coherent v1 architecture, not a fully hardened multi-tenant platform. Explicitly
deferred:

- **Team accounts**: the schema (`Organization`, `OrganizationMember`) and ownership checks are in
  place, but the tRPC routers currently only implement personal-project ownership checks
  (`assertProjectOwnership` compares `project.userId`), not organization-shared project access. Wiring
  org-scoped access control through every router is the next increment.
- **Public API + webhooks for customers**: `ApiKey` and `WebhookEndpoint`/`WebhookDelivery` models exist
  in the schema for the "API" and "Webhooks" features, but the routers/middleware that authenticate an
  API key and dispatch outbound webhooks aren't implemented yet — this is real, scoped follow-up work,
  not a hidden gap.
- **Rate limiting** on generation endpoints (per-user concurrency caps) isn't implemented; BullMQ
  concurrency settings cap *system-wide* throughput per stage but not per-user fairness.
- **Layout regeneration** replaces the whole room/connection set rather than diffing against
  user-edited rows (see §6).
