/**
 * Tests for AsyncStorageCacheAdapter.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AsyncStorageCacheAdapter } from './storage';
import type { IAsyncStorage } from './storage';

/** In-memory AsyncStorage mock. */
function createMockStorage(): IAsyncStorage & { _store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    _store: store,
    async getItem(key: string) {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe('AsyncStorageCacheAdapter', () => {
  let storage: ReturnType<typeof createMockStorage>;
  let cache: AsyncStorageCacheAdapter;

  beforeEach(() => {
    storage = createMockStorage();
    cache = new AsyncStorageCacheAdapter(storage);
  });

  it('returns null for a locale that has not been cached', async () => {
    expect(await cache.get('en')).toBeNull();
  });

  it('stores and retrieves a translation map', async () => {
    const map = { hello: 'Hello', world: 'World' };
    await cache.set('en', map);
    expect(await cache.get('en')).toEqual(map);
  });

  it('overwrites an existing cache entry', async () => {
    await cache.set('en', { hello: 'Hello' });
    await cache.set('en', { hello: 'Hi' });
    expect(await cache.get('en')).toEqual({ hello: 'Hi' });
  });

  it('removes a cached locale', async () => {
    await cache.set('fr', { hello: 'Bonjour' });
    await cache.remove('fr');
    expect(await cache.get('fr')).toBeNull();
  });

  it('has() returns false when the locale is not cached', async () => {
    expect(await cache.has('de')).toBe(false);
  });

  it('has() returns true after a locale is cached', async () => {
    await cache.set('de', { hello: 'Hallo' });
    expect(await cache.has('de')).toBe(true);
  });

  it('namespaces keys to avoid collisions with other storage entries', async () => {
    const cache1 = new AsyncStorageCacheAdapter(storage, 'app1');
    const cache2 = new AsyncStorageCacheAdapter(storage, 'app2');

    await cache1.set('en', { title: 'App 1' });
    await cache2.set('en', { title: 'App 2' });

    expect(await cache1.get('en')).toEqual({ title: 'App 1' });
    expect(await cache2.get('en')).toEqual({ title: 'App 2' });
  });

  it('returns null (cache miss) for corrupted JSON', async () => {
    await storage.setItem('i18n:translations:en', 'not-valid-json');
    expect(await cache.get('en')).toBeNull();
  });
});
