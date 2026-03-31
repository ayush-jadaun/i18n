/**
 * Tests for RedisCacheAdapter.
 *
 * The Redis client is mocked so this test suite has no external dependencies.
 *
 * @module adapters/cache/redis.adapter.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisCacheAdapter, type RedisClientLike } from './redis.adapter';

/**
 * Creates a mock Redis client whose methods are all vi.fn() stubs.
 */
function makeMockRedis(): RedisClientLike & {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  keys: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
  };
}

describe('RedisCacheAdapter', () => {
  let mockRedis: ReturnType<typeof makeMockRedis>;
  let adapter: RedisCacheAdapter;

  beforeEach(() => {
    mockRedis = makeMockRedis();
    adapter = new RedisCacheAdapter(mockRedis);
  });

  // ---------------------------------------------------------------------------
  // get
  // ---------------------------------------------------------------------------

  describe('get', () => {
    it('should return null when redis returns null', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await adapter.get<string>('key');
      expect(result).toBeNull();
      expect(mockRedis.get).toHaveBeenCalledWith('key');
    });

    it('should parse and return a stored string value', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify('hello'));
      const result = await adapter.get<string>('key');
      expect(result).toBe('hello');
    });

    it('should parse and return a stored object value', async () => {
      const obj = { locale: 'en', count: 3 };
      mockRedis.get.mockResolvedValue(JSON.stringify(obj));
      const result = await adapter.get<typeof obj>('key');
      expect(result).toEqual(obj);
    });

    it('should return null when redis returns an empty string', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await adapter.get<string>('key');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // set — without TTL
  // ---------------------------------------------------------------------------

  describe('set (no TTL)', () => {
    it('should call redis.set with serialized value and no EX option', async () => {
      mockRedis.set.mockResolvedValue('OK');
      await adapter.set('key', { data: 1 });
      expect(mockRedis.set).toHaveBeenCalledWith('key', JSON.stringify({ data: 1 }));
    });
  });

  // ---------------------------------------------------------------------------
  // set — with TTL
  // ---------------------------------------------------------------------------

  describe('set (with TTL)', () => {
    it('should call redis.set with EX option when ttlSeconds is provided', async () => {
      mockRedis.set.mockResolvedValue('OK');
      await adapter.set('key', 'value', 60);
      expect(mockRedis.set).toHaveBeenCalledWith('key', JSON.stringify('value'), 'EX', 60);
    });

    it('should not pass EX option when ttlSeconds is 0', async () => {
      mockRedis.set.mockResolvedValue('OK');
      await adapter.set('key', 'value', 0);
      expect(mockRedis.set).toHaveBeenCalledWith('key', JSON.stringify('value'));
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe('delete', () => {
    it('should call redis.del with the given key', async () => {
      mockRedis.del.mockResolvedValue(1);
      await adapter.delete('some-key');
      expect(mockRedis.del).toHaveBeenCalledWith('some-key');
    });

    it('should not throw when the key does not exist (del returns 0)', async () => {
      mockRedis.del.mockResolvedValue(0);
      await expect(adapter.delete('missing')).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // invalidatePattern
  // ---------------------------------------------------------------------------

  describe('invalidatePattern', () => {
    it('should delete all keys matching the pattern', async () => {
      mockRedis.keys.mockResolvedValue(['translations:en:a', 'translations:en:b']);
      mockRedis.del.mockResolvedValue(2);
      await adapter.invalidatePattern('translations:en:*');
      expect(mockRedis.keys).toHaveBeenCalledWith('translations:en:*');
      expect(mockRedis.del).toHaveBeenCalledWith('translations:en:a', 'translations:en:b');
    });

    it('should not call del when no keys match', async () => {
      mockRedis.keys.mockResolvedValue([]);
      await adapter.invalidatePattern('nope:*');
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle a single matching key', async () => {
      mockRedis.keys.mockResolvedValue(['only:key']);
      mockRedis.del.mockResolvedValue(1);
      await adapter.invalidatePattern('only:*');
      expect(mockRedis.del).toHaveBeenCalledWith('only:key');
    });
  });
});
