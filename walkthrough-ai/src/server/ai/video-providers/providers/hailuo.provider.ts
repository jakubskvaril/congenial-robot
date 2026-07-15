import type {
  VideoGenerationHandle,
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoProvider,
} from '../types';

// MiniMax Hailuo API. Bearer token auth. Adjust to current api.minimax.chat
// spec before production use.
const HAILUO_API_BASE = 'https://api.minimax.chat/v1';

export const hailuoProvider: VideoProvider = {
  name: 'HAILUO',

  estimateCostCredits(durationSeconds) {
    return Math.ceil(durationSeconds * 6);
  },

  async submit(request: VideoGenerationRequest): Promise<VideoGenerationHandle> {
    const res = await fetch(`${HAILUO_API_BASE}/video_generation`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HAILUO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'hailuo-02',
        prompt: request.promptText,
        first_frame_image: request.referenceImageUrls[0],
        duration: request.durationSeconds,
        callback_url: request.callbackUrl,
      }),
    });

    if (!res.ok) {
      throw new Error(`Hailuo submit failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { task_id: string };
    return { providerJobId: data.task_id };
  },

  async checkStatus(providerJobId: string): Promise<VideoGenerationResult> {
    const res = await fetch(`${HAILUO_API_BASE}/query/video_generation?task_id=${providerJobId}`, {
      headers: { Authorization: `Bearer ${process.env.HAILUO_API_KEY}` },
    });
    if (!res.ok) throw new Error(`Hailuo status check failed: ${res.status}`);

    const data = (await res.json()) as {
      status: 'Queueing' | 'Processing' | 'Success' | 'Fail';
      file_id?: string;
      video_url?: string;
    };

    if (data.status === 'Queueing') return { state: 'QUEUED' };
    if (data.status === 'Processing') return { state: 'PROCESSING' };
    if (data.status === 'Fail') return { state: 'FAILED', error: 'Hailuo generation failed' };
    return { state: 'COMPLETED', videoUrl: data.video_url };
  },

  parseWebhook(payload) {
    const body = payload as { task_id: string; status: 'Success' | 'Fail'; video_url?: string };
    if (body.status === 'Fail') {
      return { providerJobId: body.task_id, state: 'FAILED', error: 'Hailuo generation failed' };
    }
    return { providerJobId: body.task_id, state: 'COMPLETED', videoUrl: body.video_url };
  },
};
