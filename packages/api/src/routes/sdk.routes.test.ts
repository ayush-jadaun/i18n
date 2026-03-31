/**
 * Integration tests for the SDK delivery routes.
 *
 * These routes use API key authentication (not JWT). Tests verify both
 * successful delivery and authentication failure cases.
 *
 * Uses Fastify's `app.inject()` helper — no HTTP server is started and no real
 * PostgreSQL connection is required. The database is replaced with an
 * in-memory mock via `app.decorate('db', mockDb)`.
 *
 * @module routes/sdk.routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import bcrypt from 'bcrypt';
import '../types.js';
import { sdkRoutes } from './sdk.routes.js';
import type { Database } from '@i18n-platform/database';

// ── Stub data ────────────────────────────────────────────────────────────────

const stubProjectId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

/** A real bcrypt hash for the test key. */
const rawApiKey = 'i18n_abcdef01234567890123456789abcdef01234567890123456789abcdef012345';
const keyPrefix = rawApiKey.substring(0, 13);
let keyHash: string;

const stubTranslationRows = [
  {
    translationId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    keyId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    key: 'auth.login.title',
    locale: 'fr',
    value: 'Se connecter',
    status: 'published',
    translatedBy: 'user-1',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  },
  {
    translationId: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    keyId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    key: 'common.ok',
    locale: 'fr',
    value: 'OK',
    status: 'published',
    translatedBy: 'user-1',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  },
];

// ── Setup ────────────────────────────────────────────────────────────────────

// Pre-hash the key for tests. We use a low round count for speed.
beforeEach(async () => {
  vi.clearAllMocks();
  keyHash = await bcrypt.hash(rawApiKey, 4);
});

// ── Test app factory ─────────────────────────────────────────────────────────

async function createTestApp(mockDb: Partial<Database> = {}) {
  const app = Fastify({ logger: false });
  app.decorate('db', mockDb as Database);
  await app.register(sdkRoutes, { prefix: '/api/v1/sdk' });
  return app;
}

/**
 * Creates a mock DB that resolves the API key lookup and returns translation
 * rows for the standard project + locale.
 */
function createAuthenticatedMockDb() {
  const stubApiKeyRecord = {
    id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    projectId: stubProjectId,
    name: 'SDK Key',
    keyHash,
    keyPrefix,
    scopes: { translations: 'read' },
    environment: 'production',
    expiresAt: null,
    lastUsedAt: null,
    createdAt: new Date('2025-01-01T00:00:00Z'),
  };

  return {
    select: vi.fn()
      // findByPrefix
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubApiKeyRecord]),
          }),
        }),
      })
      // findByProjectAndLocale
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(stubTranslationRows),
          }),
        }),
      }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubApiKeyRecord]),
        }),
      }),
    }),
  };
}

// ── GET /api/v1/sdk/:projectId/:locale ──────────────────────────────────────

describe('GET /api/v1/sdk/:projectId/:locale', () => {
  it('returns translations when authenticated via Bearer header', async () => {
    const mockDb = createAuthenticatedMockDb();
    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sdk/${stubProjectId}/fr`,
      headers: { authorization: `Bearer ${rawApiKey}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { translations: Record<string, string> };
    expect(body.translations['auth.login.title']).toBe('Se connecter');
    expect(body.translations['common.ok']).toBe('OK');

    await app.close();
  });

  it('returns translations when authenticated via query parameter', async () => {
    const mockDb = createAuthenticatedMockDb();
    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sdk/${stubProjectId}/fr?apiKey=${rawApiKey}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { translations: Record<string, string> };
    expect(body.translations['auth.login.title']).toBe('Se connecter');

    await app.close();
  });

  it('returns 401 without an API key', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sdk/${stubProjectId}/fr`,
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');

    await app.close();
  });

  it('returns 401 with an invalid API key prefix', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sdk/${stubProjectId}/fr`,
      headers: { authorization: 'Bearer i18n_invalidkey123456789012345678901234567890123456789012345' },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body) as { error: { message: string } };
    expect(body.error.message).toBe('Invalid API key');

    await app.close();
  });

  it('returns 401 with a non-i18n key', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sdk/${stubProjectId}/fr`,
      headers: { authorization: 'Bearer not_a_valid_key' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 403 when key belongs to a different project', async () => {
    const otherProjectId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const stubApiKeyRecord = {
      id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
      projectId: otherProjectId,
      name: 'SDK Key',
      keyHash,
      keyPrefix,
      scopes: { translations: 'read' },
      environment: 'production',
      expiresAt: null,
      lastUsedAt: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    };

    const mockDb = {
      select: vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubApiKeyRecord]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([stubApiKeyRecord]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sdk/${stubProjectId}/fr`,
      headers: { authorization: `Bearer ${rawApiKey}` },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('FORBIDDEN');

    await app.close();
  });
});

// ── GET /api/v1/sdk/:projectId/:locale/:namespace ───────────────────────────

describe('GET /api/v1/sdk/:projectId/:locale/:namespace', () => {
  it('returns only translations matching the namespace prefix', async () => {
    const mockDb = createAuthenticatedMockDb();
    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sdk/${stubProjectId}/fr/auth`,
      headers: { authorization: `Bearer ${rawApiKey}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { translations: Record<string, string> };
    // Only the "auth." prefixed key should be included
    expect(body.translations['auth.login.title']).toBe('Se connecter');
    expect(body.translations['common.ok']).toBeUndefined();

    await app.close();
  });

  it('returns empty map when no keys match the namespace', async () => {
    const mockDb = createAuthenticatedMockDb();
    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sdk/${stubProjectId}/fr/nonexistent`,
      headers: { authorization: `Bearer ${rawApiKey}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { translations: Record<string, string> };
    expect(Object.keys(body.translations)).toHaveLength(0);

    await app.close();
  });

  it('returns 401 without an API key', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/sdk/${stubProjectId}/fr/auth`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
