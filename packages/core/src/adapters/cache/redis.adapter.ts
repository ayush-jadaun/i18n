/**
 * Redis cache adapter.
 *
 * Wraps an `ioredis`-compatible client to provide a {@link ICacheAdapter}
 * implementation backed by Redis.  The adapter serialises all values to JSON
 * before writing to Redis and parses them on read.
 *
 * The constructor accepts a {@link RedisClientLike} interface rather than
 * the concrete `ioredis` class so that:
 * - `ioredis` is not a required dependency of `@i18n-platform/core`
 * - tests can inject a lightweight mock without any external packages
 *
 * @module adapters/cache/redis
 */

import type { ICacheAdapter } from '../../interfaces/cache-adapter';

/**
 * Minimal subset of the `ioredis` `Redis` client that this adapter requires.
 *
 * Any object satisfying this interface can be passed to
 * {@link RedisCacheAdapter}. The real `ioredis` `Redis` instance satisfies it
 * automatically.
 */
export interface RedisClientLike {
  /**
   * Returns the raw string stored at `key`, or `null` if the key does not
   * exist.
   */
  get(key: string): Promise<string | null>;

  /**
   * Stores `value` at `key`.
   *
   * Overloads:
   * - `set(key, value)` — no expiry
   * - `set(key, value, 'EX', ttlSeconds)` — expire after `ttlSeconds`
   */
  set(...args: unknown[]): Promise<unknown>;

  /**
   * Deletes one or more keys. Returns the number of keys actually removed.
   */
  del(...keys: string[]): Promise<number>;

  /**
   * Returns all keys matching the given glob pattern.
   *
   * **Note**: `KEYS` is a blocking O(N) command.  It is acceptable here
   * because `invalidatePattern` is expected to be called infrequently (e.g.
   * on translation publish events), not on hot request paths.
   */
  keys(pattern: string): Promise<string[]>;
}

/**
 * Cache adapter backed by a Redis server via an `ioredis`-compatible client.
 *
 * Values are stored as JSON strings and parsed back on retrieval.  TTLs are
 * forwarded to Redis using the native `EX` option so expiry is enforced
 * server-side.
 *
 * @example
 * ```ts
 * import Redis from 'ioredis';
 * const redis = new Redis({ host: 'localhost', port: 6379 });
 * const cache = new RedisCacheAdapter(redis);
 * await cache.set('locale:en', payload, 300);
 * ```
 */
export class RedisCacheAdapter implements ICacheAdapter {
  /**
   * @param client - An `ioredis`-compatible Redis client instance
   */
  constructor(private readonly client: RedisClientLike) {}

  /**
   * Retrieves and deserialises a cached value from Redis.
   *
   * @typeParam T - Expected type of the cached value
   * @param key - Redis key to look up
   * @returns The parsed value, or `null` if the key is absent or expired
   */
  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) {
      return null;
    }
    return JSON.parse(raw) as T;
  }

  /**
   * Serialises a value and stores it in Redis.
   *
   * When `ttlSeconds` is provided and greater than zero the key is created
   * with an `EX` (expiry in seconds) option, delegating TTL management to
   * Redis.
   *
   * @typeParam T - Type of the value to store
   * @param key - Redis key under which to store the value
   * @param value - The value to serialise and cache
   * @param ttlSeconds - Optional time-to-live in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialised = JSON.stringify(value);
    if (ttlSeconds !== undefined && ttlSeconds > 0) {
      await this.client.set(key, serialised, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, serialised);
    }
  }

  /**
   * Removes a single key from Redis.
   *
   * @param key - Redis key to delete
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Finds all Redis keys matching `pattern` via `KEYS` and deletes them in a
   * single `DEL` command.
   *
   * The glob syntax is forwarded directly to Redis, so `*`, `?`, and `[…]`
   * behave according to Redis pattern-matching rules.
   *
   * @param pattern - Redis glob pattern (e.g. `"translations:en:*"`)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const matched = await this.client.keys(pattern);
    if (matched.length === 0) {
      return;
    }
    await this.client.del(...matched);
  }
}
