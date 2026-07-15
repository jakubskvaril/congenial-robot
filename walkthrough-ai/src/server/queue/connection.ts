import { ConnectionOptions } from 'bullmq';

// BullMQ requires its own connection semantics (blocking commands,
// `maxRetriesPerRequest: null`), so we parse REDIS_URL into discrete
// options rather than reusing the shared `redis` ioredis instance.
const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');

export const bullConnection: ConnectionOptions = {
  host: url.hostname,
  port: Number(url.port || 6379),
  password: url.password || undefined,
  maxRetriesPerRequest: null,
};
