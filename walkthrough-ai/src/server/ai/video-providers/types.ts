export type VideoProviderName = 'VEO' | 'KLING' | 'RUNWAY' | 'HAILUO';

export interface VideoGenerationRequest {
  promptText: string;
  negativePrompt: string;
  durationSeconds: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  referenceImageUrls: string[]; // primary establishing shots, first-frame conditioning where supported
  /** Provider webhook target for async completion notification. */
  callbackUrl: string;
  /** Opaque value echoed back on the webhook so we can correlate to our GeneratedVideo row. */
  metadata: { generatedVideoId: string };
}

export interface VideoGenerationHandle {
  providerJobId: string;
  /** Some providers return the result synchronously; most are async. */
  immediateResult?: VideoGenerationResult;
}

export type VideoJobState = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface VideoGenerationResult {
  state: VideoJobState;
  videoUrl?: string;
  thumbnailUrl?: string;
  resolution?: string;
  error?: string;
}

/**
 * Every video generation backend implements this interface. Adding a new
 * provider (e.g. a future model) means writing one adapter file and
 * registering it — nothing else in the pipeline changes.
 */
export interface VideoProvider {
  readonly name: VideoProviderName;
  /** Credits charged per generation at this provider's current pricing tier. */
  estimateCostCredits(durationSeconds: number): number;
  submit(request: VideoGenerationRequest): Promise<VideoGenerationHandle>;
  /** Poll-based status check, used as a fallback when webhooks are delayed/missed. */
  checkStatus(providerJobId: string): Promise<VideoGenerationResult>;
  /** Verify and parse an inbound webhook payload from this provider. */
  parseWebhook(payload: unknown, signatureHeader: string | null): VideoGenerationResult & { providerJobId: string };
}
