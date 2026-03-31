/**
 * Cache adapters for the i18n platform.
 *
 * Available implementations:
 * - {@link InMemoryCacheAdapter} — process-local Map-backed cache (no deps)
 * - {@link RedisCacheAdapter} — Redis-backed cache via an ioredis-compatible client
 *
 * Both implement {@link ICacheAdapter} from `../../interfaces/cache-adapter`.
 *
 * @module adapters/cache
 */

export { InMemoryCacheAdapter } from './in-memory.adapter';
export { RedisCacheAdapter } from './redis.adapter';
export type { RedisClientLike } from './redis.adapter';
