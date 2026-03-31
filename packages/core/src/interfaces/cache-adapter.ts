/**
 * Cache adapter interface for key-value caching.
 *
 * Implement this interface to integrate a caching backend
 * (e.g., Redis, Memcached, in-memory LRU).
 *
 * @module interfaces/cache-adapter
 */

/**
 * Adapter for a key-value cache backend.
 *
 * Used to cache translation lookups, MT results, and CDN manifest data.
 *
 * @example
 * ```ts
 * class RedisCache implements ICacheAdapter {
 *   async get<T>(key: string): Promise<T | null> {
 *     const raw = await this.client.get(key);
 *     return raw ? (JSON.parse(raw) as T) : null;
 *   }
 *   // ...
 * }
 * ```
 */
export interface ICacheAdapter {
  /**
   * Retrieves a cached value by key.
   *
   * @typeParam T - Expected type of the cached value
   * @param key - Cache key to look up
   * @returns The cached value, or `null` if the key does not exist or has expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Stores a value in the cache.
   *
   * @typeParam T - Type of the value being stored
   * @param key - Cache key under which to store the value
   * @param value - The value to cache
   * @param ttlSeconds - Time-to-live in seconds; `undefined` means no expiry
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Removes a single cached value.
   *
   * @param key - Cache key to remove
   */
  delete(key: string): Promise<void>;

  /**
   * Removes all cached values whose keys match the given glob pattern.
   *
   * @param pattern - Glob pattern to match against cache keys
   *   (e.g., `"translations:en:*"` to clear all English translations)
   */
  invalidatePattern(pattern: string): Promise<void>;
}
