/**
 * AsyncStorage-backed cache adapter for offline translation support.
 *
 * React Native's `AsyncStorage` is injected rather than imported directly,
 * keeping this module free of any native dependencies and making it fully
 * testable in Node.js / Vitest environments.
 *
 * @module storage
 */

/**
 * Minimal interface that mirrors `@react-native-async-storage/async-storage`.
 *
 * Inject a compatible implementation (the real `AsyncStorage` on-device, or a
 * mock in tests) when constructing {@link AsyncStorageCacheAdapter}.
 */
export interface IAsyncStorage {
  /**
   * Retrieves the value associated with `key`.
   * Returns `null` when the key does not exist.
   */
  getItem(key: string): Promise<string | null>;
  /** Stores `value` for `key`. */
  setItem(key: string, value: string): Promise<void>;
  /** Removes the item identified by `key`. */
  removeItem(key: string): Promise<void>;
}

/**
 * A flat map of translation key → translated string.
 * Matches the `TranslationMap` type from `@i18n-platform/core`.
 */
export type TranslationMap = Record<string, string>;

/**
 * Implements an offline-capable translation cache backed by AsyncStorage.
 *
 * Serialises {@link TranslationMap} objects to JSON and stores them under
 * namespaced keys so multiple locales can coexist without collisions.
 *
 * @example
 * ```ts
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 *
 * const cache = new AsyncStorageCacheAdapter(AsyncStorage, 'myapp');
 * await cache.set('en', { hello: 'Hello' });
 * const map = await cache.get('en'); // { hello: 'Hello' }
 * ```
 */
export class AsyncStorageCacheAdapter {
  private readonly storage: IAsyncStorage;
  private readonly namespace: string;

  /**
   * @param storage - An AsyncStorage-compatible implementation
   * @param namespace - Key prefix used to namespace cache entries.
   *   Defaults to `"i18n"`.
   */
  constructor(storage: IAsyncStorage, namespace = 'i18n') {
    this.storage = storage;
    this.namespace = namespace;
  }

  /**
   * Builds the storage key for a given locale.
   *
   * @param locale - BCP-47 locale code
   * @returns The namespaced storage key
   * @internal
   */
  private keyFor(locale: string): string {
    return `${this.namespace}:translations:${locale}`;
  }

  /**
   * Retrieves the cached translation map for a locale.
   *
   * @param locale - BCP-47 locale code
   * @returns The cached {@link TranslationMap}, or `null` if not cached
   */
  async get(locale: string): Promise<TranslationMap | null> {
    const raw = await this.storage.getItem(this.keyFor(locale));
    if (raw === null) return null;

    try {
      return JSON.parse(raw) as TranslationMap;
    } catch {
      // Corrupted data — treat as a cache miss.
      return null;
    }
  }

  /**
   * Stores a translation map for a locale.
   *
   * @param locale - BCP-47 locale code
   * @param map - The translation map to persist
   */
  async set(locale: string, map: TranslationMap): Promise<void> {
    await this.storage.setItem(this.keyFor(locale), JSON.stringify(map));
  }

  /**
   * Removes the cached translation map for a locale.
   *
   * @param locale - BCP-47 locale code
   */
  async remove(locale: string): Promise<void> {
    await this.storage.removeItem(this.keyFor(locale));
  }

  /**
   * Returns `true` when a non-null cache entry exists for the locale.
   *
   * @param locale - BCP-47 locale code
   */
  async has(locale: string): Promise<boolean> {
    const raw = await this.storage.getItem(this.keyFor(locale));
    return raw !== null;
  }
}
