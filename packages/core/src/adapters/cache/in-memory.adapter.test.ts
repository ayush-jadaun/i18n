/**
 * Tests for InMemoryCacheAdapter.
 *
 * @module adapters/cache/in-memory.adapter.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InMemoryCacheAdapter } from './in-memory.adapter';

describe('InMemoryCacheAdapter', () => {
  let adapter: InMemoryCacheAdapter;

  beforeEach(() => {
    adapter = new InMemoryCacheAdapter();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // get / set — no TTL
  // ---------------------------------------------------------------------------

  describe('set and get (no TTL)', () => {
    it('should return null for a key that was never set', async () => {
      const result = await adapter.get<string>('missing');
      expect(result).toBeNull();
    });

    it('should store and retrieve a string value', async () => {
      await adapter.set('key', 'hello');
      const result = await adapter.get<string>('key');
      expect(result).toBe('hello');
    });

    it('should store and retrieve an object value', async () => {
      const obj = { locale: 'en', count: 42 };
      await adapter.set('obj-key', obj);
      const result = await adapter.get<typeof obj>('obj-key');
      expect(result).toEqual(obj);
    });

    it('should overwrite an existing key', async () => {
      await adapter.set('k', 'first');
      await adapter.set('k', 'second');
      const result = await adapter.get<string>('k');
      expect(result).toBe('second');
    });

    it('should store null as a value', async () => {
      await adapter.set('nullable', null);
      // null stored explicitly — get returns it back
      const result = await adapter.get<null>('nullable');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // TTL
  // ---------------------------------------------------------------------------

  describe('TTL expiry', () => {
    it('should return the value before TTL expires', async () => {
      await adapter.set('ttl-key', 'alive', 10); // 10 s
      vi.advanceTimersByTime(9_000); // 9 s elapsed
      const result = await adapter.get<string>('ttl-key');
      expect(result).toBe('alive');
    });

    it('should return null after TTL expires', async () => {
      await adapter.set('ttl-key', 'alive', 10); // 10 s
      vi.advanceTimersByTime(10_001); // just past expiry
      const result = await adapter.get<string>('ttl-key');
      expect(result).toBeNull();
    });

    it('should not expire a key set without TTL', async () => {
      await adapter.set('persistent', 'value');
      vi.advanceTimersByTime(1_000_000);
      const result = await adapter.get<string>('persistent');
      expect(result).toBe('value');
    });

    it('should allow overwriting a TTL key with no-TTL key', async () => {
      await adapter.set('k', 'v', 5);
      await adapter.set('k', 'persistent');
      vi.advanceTimersByTime(10_000);
      const result = await adapter.get<string>('k');
      expect(result).toBe('persistent');
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe('delete', () => {
    it('should remove an existing key', async () => {
      await adapter.set('to-delete', 'bye');
      await adapter.delete('to-delete');
      const result = await adapter.get<string>('to-delete');
      expect(result).toBeNull();
    });

    it('should not throw when deleting a non-existent key', async () => {
      await expect(adapter.delete('ghost')).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // invalidatePattern
  // ---------------------------------------------------------------------------

  describe('invalidatePattern', () => {
    beforeEach(async () => {
      await adapter.set('translations:en:greeting', 'Hello');
      await adapter.set('translations:en:farewell', 'Goodbye');
      await adapter.set('translations:fr:greeting', 'Bonjour');
      await adapter.set('metrics:requests', 999);
    });

    it('should remove keys matching a prefix wildcard', async () => {
      await adapter.invalidatePattern('translations:en:*');
      expect(await adapter.get('translations:en:greeting')).toBeNull();
      expect(await adapter.get('translations:en:farewell')).toBeNull();
    });

    it('should leave non-matching keys intact', async () => {
      await adapter.invalidatePattern('translations:en:*');
      expect(await adapter.get('translations:fr:greeting')).toBe('Bonjour');
      expect(await adapter.get<number>('metrics:requests')).toBe(999);
    });

    it('should support a full wildcard pattern', async () => {
      await adapter.invalidatePattern('*');
      expect(await adapter.get('translations:en:greeting')).toBeNull();
      expect(await adapter.get('translations:fr:greeting')).toBeNull();
      expect(await adapter.get<number>('metrics:requests')).toBeNull();
    });

    it('should support a mid-string wildcard', async () => {
      await adapter.invalidatePattern('translations:*:greeting');
      expect(await adapter.get('translations:en:greeting')).toBeNull();
      expect(await adapter.get('translations:fr:greeting')).toBeNull();
      // farewell key is untouched
      expect(await adapter.get('translations:en:farewell')).toBe('Goodbye');
    });

    it('should handle a pattern that matches nothing', async () => {
      await expect(adapter.invalidatePattern('nope:*')).resolves.toBeUndefined();
      expect(await adapter.get('translations:en:greeting')).toBe('Hello');
    });
  });
});
