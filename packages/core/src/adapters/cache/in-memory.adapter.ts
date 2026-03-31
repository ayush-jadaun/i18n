/**
 * In-memory cache adapter backed by a plain JavaScript `Map`.
 *
 * Suitable for local development, unit tests, and single-process deployments
 * where a shared cache (e.g., Redis) is not required.  Because the cache
 * lives in process memory it does **not** survive restarts and is not shared
 * across multiple server instances.
 *
 * @module adapters/cache/in-memory
 */

import type { ICacheAdapter } from '../../interfaces/cache-adapter';

/**
 * Internal cache entry shape.
 *
 * @internal
 */
interface CacheEntry {
  /** The stored value (untyped at rest). */
  value: unknown;
  /**
   * Unix timestamp (milliseconds) at which this entry expires,
   * or `null` if it never expires.
   */
  expiresAt: number | null;
}

/**
 * Converts a Redis/Minimatch-style glob pattern to a `RegExp`.
 *
 * Supported wildcards:
 * - `*`  — matches any sequence of characters except nothing (zero-or-more)
 * - `?`  — matches exactly one character
 *
 * All other regex meta-characters in the pattern are escaped.
 *
 * @param glob - Glob pattern string to convert
 * @returns A `RegExp` that matches strings conforming to the glob
 * @internal
 */
function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const withWildcards = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${withWildcards}$`);
}

/**
 * Cache adapter that stores values in an in-process `Map`.
 *
 * All operations are synchronous under the hood but exposed through an
 * `async` API to conform to {@link ICacheAdapter}.
 *
 * @example
 * ```ts
 * const cache = new InMemoryCacheAdapter();
 * await cache.set('user:1', { name: 'Alice' }, 300);
 * const user = await cache.get<{ name: string }>('user:1');
 * ```
 */
export class InMemoryCacheAdapter implements ICacheAdapter {
  /** Internal storage map. */
  private readonly store = new Map<string, CacheEntry>();

  /**
   * Retrieves a value from the cache.
   *
   * If the entry has expired it is removed from the store before returning
   * `null` (lazy eviction).
   *
   * @typeParam T - Expected type of the cached value
   * @param key - Cache key to look up
   * @returns The cached value cast to `T`, or `null` if missing / expired
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (entry === undefined) {
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Stores a value in the cache under the given key.
   *
   * @typeParam T - Type of the value to store
   * @param key - Cache key under which to store the value
   * @param value - The value to cache
   * @param ttlSeconds - Time-to-live in seconds; omit or pass `undefined`
   *   for a non-expiring entry
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt =
      ttlSeconds !== undefined && ttlSeconds > 0
        ? Date.now() + ttlSeconds * 1_000
        : null;

    this.store.set(key, { value, expiresAt });
  }

  /**
   * Removes the entry for `key` from the cache.
   *
   * Does nothing if the key does not exist.
   *
   * @param key - Cache key to remove
   */
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Removes all entries whose keys match the given glob pattern.
   *
   * The pattern supports `*` (any sequence of characters) and `?`
   * (any single character).  For example, `"translations:en:*"` removes
   * every cached English translation.
   *
   * @param pattern - Glob pattern to match against cache keys
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const regex = globToRegex(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }
}
