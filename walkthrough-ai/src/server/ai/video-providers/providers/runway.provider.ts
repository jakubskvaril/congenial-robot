import type {
  VideoGenerationHandle,
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoProvider,
} from '../types';

// Runway ML's Gen-3/Gen-4 API. Bearer token auth. Adjust to current
// dev.runwayml.com API version header before production use.
const RUNWAY_API_BASE = 'https://api.runwayml.com/v1';

export const runwayProvider: VideoProvider = {
  name: 'RUNWAY',

  estimateCostCredits(durationSeconds) {
    return Math.ceil(durationSeconds * 10);
  },

  async submit(request: VideoGenerationRequest): Promise<VideoGenerationHandle> {
    const res = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        promptText: request.promptText,
        promptImage: request.referenceImageUrls[0],
        duration: request.durationSeconds,
        ratio: request.aspectRatio === '16:9' ? '1280:768' : '768:1280',
        webhookUrl: request.callbackUrl,
      }),
    });

    if (!res.ok) {
      throw new Error(`Runway submit failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { id: string };
    return { providerJobId: data.id };
  },

  async checkStatus(providerJobId: string): Promise<VideoGenerationResult> {
    const res = await fetch(`${RUNWAY_API_BASE}/tasks/${providerJobId}`, {
      headers: {
        Authorization: `Bearer ${process.env.RUNWAY_API_KEY}`,
        'X-Runway-Version': '2024-11-06',
      },
    });
    if (!res.ok) throw new Error(`Runway status check failed: ${res.status}`);

    const data = (await res.json()) as {
      status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
      output?: string[];
      failure?: string;
    };

    if (data.status === 'PENDING') return { state: 'QUEUED' };
    if (data.status === 'RUNNING') return { state: 'PROCESSING' };
    if (data.status === 'FAILED') return { state: 'FAILED', error: data.failure };
    return { state: 'COMPLETED', videoUrl: data.output?.[0] };
  },

  parseWebhook(payload) {
    const body = payload as {
      id: string;
      status: 'SUCCEEDED' | 'FAILED';
      output?: string[];
      failure?: string;
    };

    if (body.status === 'FAILED') {
      return { providerJobId: body.id, state: 'FAILED', error: body.failure };
    }
    return { providerJobId: body.id, state: 'COMPLETED', videoUrl: body.output?.[0] };
  },
};
