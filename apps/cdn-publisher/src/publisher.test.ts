/**
 * Tests for CdnPublisher.
 *
 * Uses an in-memory mock {@link IStorageAdapter} to verify the full publish
 * pipeline without touching real storage. Covers versioned + alias uploads,
 * result shape, and error propagation.
 *
 * @module publisher.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IStorageAdapter, UploadResult, StorageObject } from '@i18n-platform/core';
import { BundleGenerator } from './bundle-generator';
import { VersionManager } from './version-manager';
import { CdnPublisher } from './publisher';
import type { TranslationRow } from './bundle-generator';

// ── Mock storage adapter ──────────────────────────────────────────────────────

/**
 * In-memory storage adapter for testing — stores objects in a `Map`.
 * Every `upload` call is tracked so tests can assert what was written.
 */
class MockStorageAdapter implements IStorageAdapter {
  readonly storageId = 'mock';

  /** All objects uploaded during the test, keyed by storage key. */
  readonly store = new Map<string, { data: Uint8Array; contentType: string }>();

  /** Spy-friendly call log for `upload`. */
  readonly uploadCalls: { key: string; contentType: string }[] = [];

  async upload(key: string, data: Uint8Array, contentType: string): Promise<UploadResult> {
    this.store.set(key, { data, contentType });
    this.uploadCalls.push({ key, contentType });
    return {
      key,
      publicUrl: `https://cdn.example.com/${key}`,
      sizeBytes: data.byteLength,
      contentType,
      uploadedAt: new Date().toISOString(),
    };
  }

  async download(key: string): Promise<Uint8Array> {
    const entry = this.store.get(key);
    if (!entry) {
      throw new Error(`Object not found: ${key}`);
    }
    return entry.data;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  getPublicUrl(key: string): string | null {
    return `https://cdn.example.com/${key}`;
  }

  async list(_prefix: string): Promise<StorageObject[]> {
    return [];
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ROWS: TranslationRow[] = [
  { key: 'common.save',      locale: 'en', value: 'Save',         namespace: 'common' },
  { key: 'common.cancel',    locale: 'en', value: 'Cancel',       namespace: 'common' },
  { key: 'auth.login.title', locale: 'en', value: 'Log in',       namespace: 'auth'   },
  { key: 'auth.login.title', locale: 'fr', value: 'Se connecter', namespace: 'auth'   },
  { key: 'common.save',      locale: 'fr', value: 'Enregistrer',  namespace: 'common' },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CdnPublisher', () => {
  let storage: MockStorageAdapter;
  let publisher: CdnPublisher;

  beforeEach(() => {
    storage = new MockStorageAdapter();
    publisher = new CdnPublisher(
      storage,
      new BundleGenerator(),
      new VersionManager(),
    );
  });

  // ── publish result shape ────────────────────────────────────────────────────

  it('returns a PublishResult with the expected shape', async () => {
    const result = await publisher.publish({ rows: ROWS });

    expect(typeof result.version).toBe('string');
    expect(result.version).toMatch(/^v\d+$/);
    expect(typeof result.bundleCount).toBe('number');
    expect(typeof result.aliasCount).toBe('number');
    expect(Array.isArray(result.uploads)).toBe(true);
    expect(typeof result.publishedAt).toBe('string');
  });

  it('publishedAt is a valid ISO 8601 timestamp', async () => {
    const result = await publisher.publish({ rows: ROWS });
    expect(() => new Date(result.publishedAt).toISOString()).not.toThrow();
  });

  // ── bundle + alias counts ──────────────────────────────────────────────────

  it('produces one versioned bundle per locale (en + fr)', async () => {
    const result = await publisher.publish({ rows: ROWS });
    expect(result.bundleCount).toBe(2);
  });

  it('produces one latest alias per versioned bundle', async () => {
    const result = await publisher.publish({ rows: ROWS });
    expect(result.aliasCount).toBe(result.bundleCount);
  });

  it('uploads versioned bundles and aliases (total = bundleCount * 2)', async () => {
    const result = await publisher.publish({ rows: ROWS });
    expect(result.uploads).toHaveLength(result.bundleCount + result.aliasCount);
  });

  // ── storage interaction ────────────────────────────────────────────────────

  it('calls storage.upload for every bundle and alias', async () => {
    const result = await publisher.publish({ rows: ROWS });
    expect(storage.uploadCalls).toHaveLength(result.uploads.length);
  });

  it('uploads versioned bundle keys matching /bundles/<locale>/v\\d+\\.json/', async () => {
    await publisher.publish({ rows: ROWS });
    const versionedKeys = storage.uploadCalls
      .map((c) => c.key)
      .filter((k) => /bundles\/[^/]+\/v\d+\.json$/.test(k));
    expect(versionedKeys).toHaveLength(2); // en and fr
  });

  it('uploads latest alias keys matching /bundles/<locale>/latest\\.json/', async () => {
    await publisher.publish({ rows: ROWS });
    const latestKeys = storage.uploadCalls
      .map((c) => c.key)
      .filter((k) => /bundles\/[^/]+\/latest\.json$/.test(k));
    expect(latestKeys).toHaveLength(2); // en and fr
  });

  it('all uploads use contentType "application/json"', async () => {
    await publisher.publish({ rows: ROWS });
    for (const call of storage.uploadCalls) {
      expect(call.contentType).toBe('application/json');
    }
  });

  // ── explicit version ───────────────────────────────────────────────────────

  it('uses the explicitly supplied version string', async () => {
    const result = await publisher.publish({ rows: ROWS, version: 'v9999' });
    expect(result.version).toBe('v9999');
    const versionedKey = storage.uploadCalls.find((c) => c.key.includes('v9999'));
    expect(versionedKey).toBeDefined();
  });

  // ── empty rows ─────────────────────────────────────────────────────────────

  it('handles empty rows gracefully (no uploads)', async () => {
    const result = await publisher.publish({ rows: [] });
    expect(result.bundleCount).toBe(0);
    expect(result.aliasCount).toBe(0);
    expect(result.uploads).toHaveLength(0);
    expect(storage.uploadCalls).toHaveLength(0);
  });

  // ── error propagation ──────────────────────────────────────────────────────

  it('propagates storage upload errors', async () => {
    vi.spyOn(storage, 'upload').mockRejectedValueOnce(new Error('Network failure'));
    await expect(publisher.publish({ rows: ROWS })).rejects.toThrow('Network failure');
  });
});
