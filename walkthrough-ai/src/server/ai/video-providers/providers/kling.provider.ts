import crypto from 'node:crypto';
import type {
  VideoGenerationHandle,
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoProvider,
} from '../types';

// Kling (Kuaishou) uses an access-key/secret-key JWT auth scheme. Adjust to
// the current KlingAI OpenAPI spec before production use.
const KLING_API_BASE = 'https://api.klingai.com/v1';

function signJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: process.env.KLING_ACCESS_KEY,
      exp: Math.floor(Date.now() / 1000) + 1800,
      nbf: Math.floor(Date.now() / 1000) - 5,
    }),
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.KLING_SECRET_KEY ?? '')
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export const klingProvider: VideoProvider = {
  name: 'KLING',

  estimateCostCredits(durationSeconds) {
    return Math.ceil(durationSeconds * 8);
  },

  async submit(request: VideoGenerationRequest): Promise<VideoGenerationHandle> {
    const res = await fetch(`${KLING_API_BASE}/videos/image2video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${signJwt()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.promptText,
        negative_prompt: request.negativePrompt,
        duration: String(request.durationSeconds),
        aspect_ratio: request.aspectRatio,
        image: request.referenceImageUrls[0],
        callback_url: request.callbackUrl,
        external_task_id: request.metadata.generatedVideoId,
      }),
    });

    if (!res.ok) {
      throw new Error(`Kling submit failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { data: { task_id: string } };
    return { providerJobId: data.data.task_id };
  },

  async checkStatus(providerJobId: string): Promise<VideoGenerationResult> {
    const res = await fetch(`${KLING_API_BASE}/videos/image2video/${providerJobId}`, {
      headers: { Authorization: `Bearer ${signJwt()}` },
    });
    if (!res.ok) throw new Error(`Kling status check failed: ${res.status}`);

    const data = (await res.json()) as {
      data: {
        task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
        task_status_msg?: string;
        task_result?: { videos: { url: string; cover_image_url?: string }[] };
      };
    };

    const status = data.data.task_status;
    if (status === 'submitted') return { state: 'QUEUED' };
    if (status === 'processing') return { state: 'PROCESSING' };
    if (status === 'failed') return { state: 'FAILED', error: data.data.task_status_msg };

    const video = data.data.task_result?.videos[0];
    return { state: 'COMPLETED', videoUrl: video?.url, thumbnailUrl: video?.cover_image_url };
  },

  parseWebhook(payload) {
    const body = payload as {
      task_id: string;
      task_status: 'succeed' | 'failed';
      task_status_msg?: string;
      task_result?: { videos: { url: string; cover_image_url?: string }[] };
    };

    if (body.task_status === 'failed') {
      return { providerJobId: body.task_id, state: 'FAILED', error: body.task_status_msg };
    }
    const video = body.task_result?.videos[0];
    return {
      providerJobId: body.task_id,
      state: 'COMPLETED',
      videoUrl: video?.url,
      thumbnailUrl: video?.cover_image_url,
    };
  },
};
