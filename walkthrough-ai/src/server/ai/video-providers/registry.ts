import type { VideoProvider, VideoProviderName } from './types';
import { veoProvider } from './providers/veo.provider';
import { klingProvider } from './providers/kling.provider';
import { runwayProvider } from './providers/runway.provider';
import { hailuoProvider } from './providers/hailuo.provider';

const registry: Record<VideoProviderName, VideoProvider> = {
  VEO: veoProvider,
  KLING: klingProvider,
  RUNWAY: runwayProvider,
  HAILUO: hailuoProvider,
};

export function getVideoProvider(name: VideoProviderName): VideoProvider {
  const provider = registry[name];
  if (!provider) throw new Error(`Unknown video provider: ${name}`);
  return provider;
}

export function getDefaultVideoProvider(): VideoProvider {
  const name = (process.env.VIDEO_PROVIDER_DEFAULT?.toUpperCase() as VideoProviderName) ?? 'VEO';
  return getVideoProvider(name);
}

export const allVideoProviders = registry;
