import crypto from 'node:crypto';
import type {
  VideoGenerationHandle,
  VideoGenerationRequest,
  VideoGenerationResult,
  VideoProvider,
} from '../types';

// NOTE: Google Veo's public API surface (endpoints/auth/payload shape) is
// evolving rapidly. This adapter targets the long-running-operation model
// used by Google's generative video APIs — adjust endpoint paths and auth
// (API key vs. Vertex AI service account) to match the current docs before
// going live; the VideoProvider interface contract is what matters to the
// rest of the pipeline.
const VEO_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export const veoProvider: VideoProvider = {
  name: 'VEO',

  estimateCostCredits(durationSeconds) {
    // Veo is priced per second of output at a premium tier in our credit model.
    return Math.ceil(durationSeconds * 12);
  },

  async submit(request: VideoGenerationRequest): Promise<VideoGenerationHandle> {
    const res = await fetch(`${VEO_API_BASE}/models/veo-3:generateVideo?key=${process.env.GOOGLE_VEO_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: request.promptText,
        negativePrompt: request.negativePrompt,
        durationSeconds: request.durationSeconds,
        aspectRatio: request.aspectRatio,
        referenceImages: request.referenceImageUrls,
        webhookUrl: request.callbackUrl,
        metadata: request.metadata,
      }),
    });

    if (!res.ok) {
      throw new Error(`Veo submit failed: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { name: string };
    return { providerJobId: data.name };
  },

  async checkStatus(providerJobId: string): Promise<VideoGenerationResult> {
    const res = await fetch(`${VEO_API_BASE}/${providerJobId}?key=${process.env.GOOGLE_VEO_API_KEY}`);
    if (!res.ok) throw new Error(`Veo status check failed: ${res.status}`);

    const data = (await res.json()) as {
      done: boolean;
      response?: { videoUri: string; thumbnailUri?: string; resolution?: string };
      error?: { message: string };
    };

    if (!data.done) return { state: 'PROCESSING' };
    if (data.error) return { state: 'FAILED', error: data.error.message };
    return {
      state: 'COMPLETED',
      videoUrl: data.response?.videoUri,
      thumbnailUrl: data.response?.thumbnailUri,
      resolution: data.response?.resolution,
    };
  },

  parseWebhook(payload, signatureHeader) {
    const body = payload as {
      name: string;
      metadata: { generatedVideoId: string };
      done: boolean;
      response?: { videoUri: string; thumbnailUri?: string; resolution?: string };
      error?: { message: string };
      signature?: string;
    };

    const expected = crypto
      .createHmac('sha256', process.env.GOOGLE_VEO_API_KEY ?? '')
      .update(JSON.stringify({ name: body.name, done: body.done }))
      .digest('hex');
    if (signatureHeader !== expected) {
      throw new Error('Veo webhook signature mismatch');
    }

    if (!body.done) return { providerJobId: body.name, state: 'PROCESSING' };
    if (body.error) return { providerJobId: body.name, state: 'FAILED', error: body.error.message };
    return {
      providerJobId: body.name,
      state: 'COMPLETED',
      videoUrl: body.response?.videoUri,
      thumbnailUrl: body.response?.thumbnailUri,
      resolution: body.response?.resolution,
    };
  },
};
