import Redis from 'ioredis';

// Shared connection reused by BullMQ queues/workers and ad-hoc caching
// (e.g. rate limiting, idempotency keys for provider webhooks).
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // required by BullMQ blocking commands
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}
