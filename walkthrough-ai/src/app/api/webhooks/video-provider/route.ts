import { NextRequest, NextResponse } from 'next/server';
import { getVideoProvider } from '@/server/ai/video-providers/registry';
import type { VideoProviderName } from '@/server/ai/video-providers/types';
import { db } from '@/server/db';
import { applyVideoGenerationResult } from '@/server/queue/videoResult.service';

/**
 * Single shared inbound endpoint for all video providers (Veo, Kling,
 * Runway, Hailuo). Each provider's submission includes its own name as a
 * `?provider=` query param on the callback URL, so we can look up the
 * matching adapter and let it own signature verification and payload
 * shape — this route just dispatches and persists the terminal result.
 */
export async function POST(req: NextRequest) {
  const providerName = req.nextUrl.searchParams.get('provider') as VideoProviderName | null;
  if (!providerName) {
    return NextResponse.json({ error: 'Missing provider query param' }, { status: 400 });
  }

  let provider;
  try {
    provider = getVideoProvider(providerName);
  } catch {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
  }

  const payload = await req.json();
  const signature = req.headers.get('x-signature') ?? req.headers.get('signature');

  let result;
  try {
    result = provider.parseWebhook(payload, signature);
  } catch (err) {
    return NextResponse.json({ error: `Webhook verification failed: ${(err as Error).message}` }, { status: 401 });
  }

  const video = await db.generatedVideo.findFirst({ where: { providerJobId: result.providerJobId } });
  if (!video) {
    // Not necessarily an error — could be a retry after we already GC'd old jobs.
    return NextResponse.json({ received: true, matched: false });
  }

  await applyVideoGenerationResult(video.id, result);
  return NextResponse.json({ received: true, matched: true });
}
