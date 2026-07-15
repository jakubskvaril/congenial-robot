# Walkthrough AI

Generate cinematic, physically-accurate luxury real-estate walkthrough videos from 5–30 uploaded
property photos, via a five-agent AI pipeline (Image Understanding → Layout Builder → Camera Planner
→ Prompt Generator → Video Generator) instead of a single guessing LLM call.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design rationale behind every major decision.

## Stack

Next.js 14 (App Router) · TypeScript · tRPC · Prisma/PostgreSQL · Redis + BullMQ · Clerk · Stripe ·
UploadThing · Tailwind + Radix (shadcn-style primitives) · Framer Motion

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- A Clerk application (auth)
- API keys for at least one video provider (Veo / Kling / Runway / Hailuo) and Anthropic (vision/prompt agents)
- Stripe account (billing) — optional for local dev
- UploadThing account (or swap to the S3/Supabase direct-upload path in `src/server/storage/client.ts`)

## Local setup

```bash
cd walkthrough-ai
npm install
cp .env.example .env.local   # fill in real values
npm run db:push              # or `npm run db:migrate` once you have a migration history
npm run dev                  # Next.js app on :3000
```

In a second terminal, start the pipeline workers (these must run continuously — they are not part of
the Next.js request/response cycle):

```bash
npm run worker
```

### Webhooks in local dev

Clerk, Stripe, and video-provider webhooks all need a public URL. Use a tunnel (`ngrok http 3000` or
similar) and point each provider's webhook config at:

- `https://<tunnel>/api/webhooks/clerk`
- `https://<tunnel>/api/webhooks/stripe`
- Video provider callback URLs are generated automatically per-job (`?provider=VEO|KLING|RUNWAY|HAILUO`)
  from `NEXT_PUBLIC_APP_URL`, so just set that env var to your tunnel URL.

### Bootstrapping an admin user

Sign up once through the app, then run:

```bash
npm run db:seed -- --clerkId=<your Clerk user id>
```

This flips your synced `User` row to `ADMIN` and grants test credits, unlocking `/dashboard/admin`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` / `npm run start` | Production build/serve |
| `npm run worker` | Standalone BullMQ pipeline worker process — deploy separately from the web app |
| `npm run db:push` / `db:migrate` / `db:studio` / `db:seed` | Prisma workflows |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run test` | Vitest unit tests |

## Deployment shape

- **Web app** → Vercel (or any Next.js host). Serverless functions are fine here — nothing long-running
  happens in a route handler; the queue does the waiting.
- **Worker process** (`npm run worker`) → a long-lived container (Railway/Render/Fly/ECS). This is a
  hard requirement, not an optimization: BullMQ workers need a persistent Node process, which
  serverless functions are not.
- **Postgres** → managed (Neon/Supabase/RDS). Set both `DATABASE_URL` (pooled) and `DIRECT_URL`
  (direct, for migrations) if using a connection pooler like PgBouncer/Prisma Accelerate.
- **Redis** → managed (Upstash/Redis Cloud). Required by both the web app (enqueueing) and the worker
  process (consuming).

## Repository layout

```
walkthrough-ai/
  prisma/schema.prisma        full domain model — see ARCHITECTURE.md §6
  src/
    app/                      Next.js App Router — marketing, dashboard, API routes
    components/               design system (ui/) + feature components
    server/
      ai/
        agents/               the 4 LLM-driven agents (Image Understanding, Layout, Camera, Prompt)
        schemas/              Zod schemas = the data contract each agent must satisfy
        llm/client.ts         forced-tool-use structured generation wrapper (Anthropic)
        video-providers/      Agent 5 — provider-agnostic video generation abstraction
      queue/                  BullMQ queues, workers, and the pipeline orchestrator
      routers/                tRPC routers, one per domain entity
      storage/                S3/Supabase abstraction for server-originated uploads
      billing/                Stripe client
    lib/                      client-side trpc/uploadthing wiring, shared constants/utils
```
