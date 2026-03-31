/**
 * Tests for LocalFsStorageAdapter.
 *
 * Uses a real temporary directory so the file-system integration is tested
 * end-to-end without mocking `fs/promises`.
 *
 * @module adapters/storage/local-fs.adapter.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalFsStorageAdapter } from './local-fs.adapter';

describe('LocalFsStorageAdapter', () => {
  let tmpDir: string;
  let adapter: LocalFsStorageAdapter;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'i18n-local-fs-test-'));
    adapter = new LocalFsStorageAdapter({ basePath: tmpDir });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // storageId
  // ---------------------------------------------------------------------------

  it('should expose storageId "local"', () => {
    expect(adapter.storageId).toBe('local');
  });

  // ---------------------------------------------------------------------------
  // upload
  // ---------------------------------------------------------------------------

  describe('upload', () => {
    it('should write data and return correct UploadResult', async () => {
      const data = new TextEncoder().encode('Hello, world!');
      const result = await adapter.upload('test.txt', data, 'text/plain');

      expect(result.key).toBe('test.txt');
      expect(result.sizeBytes).toBe(data.byteLength);
      expect(result.contentType).toBe('text/plain');
      expect(result.publicUrl).toBeNull();
      expect(typeof result.uploadedAt).toBe('string');
      // ISO 8601 check
      expect(() => new Date(result.uploadedAt).toISOString()).not.toThrow();
    });

    it('should create nested directories automatically', async () => {
      const data = new TextEncoder().encode('nested content');
      const result = await adapter.upload('a/b/c/file.json', data, 'application/json');
      expect(result.key).toBe('a/b/c/file.json');

      // Verify we can read it back
      const downloaded = await adapter.download('a/b/c/file.json');
      expect(downloaded).toEqual(data);
    });

    it('should overwrite an existing file', async () => {
      const first = new TextEncoder().encode('first');
      const second = new TextEncoder().encode('second version');

      await adapter.upload('overwrite.txt', first, 'text/plain');
      await adapter.upload('overwrite.txt', second, 'text/plain');

      const downloaded = await adapter.download('overwrite.txt');
      expect(new TextDecoder().decode(downloaded)).toBe('second version');
    });

    it('should return publicUrl when baseUrl is configured', async () => {
      const adapterWithUrl = new LocalFsStorageAdapter({
        basePath: tmpDir,
        baseUrl: 'https://cdn.example.com',
      });
      const data = new TextEncoder().encode('hi');
      const result = await adapterWithUrl.upload('assets/logo.png', data, 'image/png');
      expect(result.publicUrl).toBe('https://cdn.example.com/assets/logo.png');
    });
  });

  // ---------------------------------------------------------------------------
  // download
  // ---------------------------------------------------------------------------

  describe('download', () => {
    it('should download a previously uploaded file', async () => {
      const data = new TextEncoder().encode('download me');
      await adapter.upload('dl.txt', data, 'text/plain');
      const result = await adapter.download('dl.txt');
      expect(result).toEqual(data);
    });

    it('should throw when the file does not exist', async () => {
      await expect(adapter.download('nonexistent.txt')).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe('delete', () => {
    it('should delete an uploaded file', async () => {
      const data = new TextEncoder().encode('bye');
      await adapter.upload('delete-me.txt', data, 'text/plain');
      await adapter.delete('delete-me.txt');
      await expect(adapter.download('delete-me.txt')).rejects.toThrow();
    });

    it('should not throw when deleting a non-existent file', async () => {
      await expect(adapter.delete('ghost.txt')).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getPublicUrl
  // ---------------------------------------------------------------------------

  describe('getPublicUrl', () => {
    it('should return null when no baseUrl is configured', () => {
      expect(adapter.getPublicUrl('file.txt')).toBeNull();
    });

    it('should return baseUrl + "/" + key when baseUrl is set', () => {
      const a = new LocalFsStorageAdapter({
        basePath: tmpDir,
        baseUrl: 'https://cdn.example.com',
      });
      expect(a.getPublicUrl('bundle/en.json')).toBe('https://cdn.example.com/bundle/en.json');
    });

    it('should not double-slash when baseUrl ends with a slash', () => {
      const a = new LocalFsStorageAdapter({
        basePath: tmpDir,
        baseUrl: 'https://cdn.example.com/',
      });
      expect(a.getPublicUrl('file.txt')).toBe('https://cdn.example.com/file.txt');
    });
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------

  describe('list', () => {
    beforeEach(async () => {
      const enc = (s: string) => new TextEncoder().encode(s);
      await adapter.upload('bundle/en/main.json', enc('{}'), 'application/json');
      await adapter.upload('bundle/fr/main.json', enc('{}'), 'application/json');
      await adapter.upload('bundle/en/extra.json', enc('{}'), 'application/json');
      await adapter.upload('other/file.txt', enc('hi'), 'text/plain');
    });

    it('should list all objects under a prefix', async () => {
      const objects = await adapter.list('bundle/en');
      expect(objects).toHaveLength(2);
      const keys = objects.map((o) => o.key).sort();
      expect(keys).toEqual(['bundle/en/extra.json', 'bundle/en/main.json']);
    });

    it('should not include objects outside the prefix', async () => {
      const objects = await adapter.list('bundle/en');
      expect(objects.every((o) => o.key.startsWith('bundle/en'))).toBe(true);
    });

    it('should list all objects under a top-level prefix', async () => {
      const objects = await adapter.list('bundle');
      expect(objects).toHaveLength(3);
    });

    it('should return an empty array when prefix matches nothing', async () => {
      const objects = await adapter.list('nonexistent');
      expect(objects).toEqual([]);
    });

    it('should return correct metadata for listed objects', async () => {
      const objects = await adapter.list('other');
      expect(objects).toHaveLength(1);
      const [obj] = objects;
      expect(obj?.key).toBe('other/file.txt');
      expect(obj?.sizeBytes).toBe(2); // 'hi'
      expect(typeof obj?.lastModifiedAt).toBe('string');
      expect(() => new Date(obj!.lastModifiedAt).toISOString()).not.toThrow();
    });
  });
});
