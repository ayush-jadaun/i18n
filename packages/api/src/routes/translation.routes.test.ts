/**
 * Integration tests for the translation key and translation management routes.
 *
 * Uses Fastify's `app.inject()` helper — no HTTP server is started and no real
 * PostgreSQL connection is required. The database is replaced with an
 * in-memory mock via `app.decorate('db', mockDb)` before routes are
 * registered.
 *
 * @module routes/translation.routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import '../types.js';
import jwtPlugin from '../plugins/jwt.js';
import { translationRoutes } from './translation.routes.js';
import type { Database } from '@i18n-platform/database';
import type { Config } from '../config.js';

// ── Test configuration ────────────────────────────────────────────────────────

/** Reusable test configuration (no real DB / Redis needed). */
const testConfig: Config = {
  port: 0,
  host: '127.0.0.1',
  databaseUrl: 'postgresql://test:test@localhost:5432/test',
  redisUrl: 'redis://localhost:6379',
  jwtSecret: 'test-secret-minimum-16-chars-long',
  jwtAccessTokenExpiry: '15m',
  jwtRefreshTokenExpiry: '7d',
  corsOrigins: 'http://localhost:3000',
  logLevel: 'error',
};

// ── Stub data ─────────────────────────────────────────────────────────────────

/** Stub user performing the requests. */
const stubUser = {
  id: 'user-uuid-1234',
  email: 'alice@example.com',
};

/** Stub project. */
const stubProject = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
};

/** Stub translation key row. */
const stubKey = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  projectId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  namespaceId: null,
  key: 'auth.login.title',
  defaultValue: 'Log in',
  description: 'Title of the login page',
  maxLength: null,
  metadata: {},
  isArchived: false,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

/** Stub translation row. */
const stubTranslation = {
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  keyId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  locale: 'fr',
  value: 'Se connecter',
  status: 'draft',
  translatedBy: 'user-uuid-1234',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

/** Stub review row. */
const stubReview = {
  id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  translationId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  reviewerId: 'user-uuid-1234',
  action: 'approved',
  comment: 'LGTM',
  reviewedAt: new Date('2025-01-01T00:00:00Z'),
};

// ── Test app factory ──────────────────────────────────────────────────────────

/**
 * Builds a minimal Fastify instance wired with the JWT plugin and translation
 * routes. The `db` decoration is replaced with `mockDb` so no PostgreSQL is needed.
 *
 * @param mockDb - Partial mock of the Drizzle database instance.
 * @returns An initialised (but not listening) Fastify app.
 */
async function createTestApp(mockDb: Partial<Database> = {}) {
  const app = Fastify({ logger: false });

  app.decorate('db', mockDb as Database);

  await app.register(jwtPlugin, { config: testConfig });
  await app.register(translationRoutes, { prefix: '/api/v1' });

  return app;
}

/**
 * Signs a valid access token for the given user using the app's JWT plugin.
 */
async function signAccessToken(
  app: Awaited<ReturnType<typeof createTestApp>>,
  user: { id: string; email: string },
): Promise<string> {
  await app.ready();
  return app.jwt.sign({ sub: user.id, email: user.email });
}

// ── POST /api/v1/projects/:projectId/keys ─────────────────────────────────────

describe('POST /api/v1/projects/:projectId/keys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('pushes keys and returns 201 with created and skipped counts', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([stubKey]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/keys`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        keys: [{ key: 'auth.login.title', defaultValue: 'Log in' }],
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { created: typeof stubKey[]; skipped: number };
    expect(body.created).toHaveLength(1);
    expect(body.skipped).toBe(0);

    await app.close();
  });

  it('returns 400 for an empty keys array', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/keys`,
      headers: { authorization: `Bearer ${token}` },
      payload: { keys: [] },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('returns 400 for a missing key field', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/keys`,
      headers: { authorization: `Bearer ${token}` },
      payload: { keys: [{ defaultValue: 'no key name' }] },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/keys`,
      payload: { keys: [{ key: 'some.key' }] },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/projects/:projectId/keys ──────────────────────────────────────

describe('GET /api/v1/projects/:projectId/keys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated keys with total count', async () => {
    const mockDb = {
      select: vi.fn()
        // findByProject
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([stubKey]),
              }),
            }),
          }),
        })
        // countByProject
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 1 }]),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}/keys`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { keys: typeof stubKey[]; total: number };
    expect(body.keys).toHaveLength(1);
    expect(body.total).toBe(1);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}/keys`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/projects/:projectId/keys/:keyId ───────────────────────────────

describe('GET /api/v1/projects/:projectId/keys/:keyId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the key when found', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubKey]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}/keys/${stubKey.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { key: typeof stubKey };
    expect(body.key.id).toBe(stubKey.id);
    expect(body.key.key).toBe('auth.login.title');

    await app.close();
  });

  it('returns 404 when key does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}/keys/non-existent-key`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}/keys/${stubKey.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── PATCH /api/v1/projects/:projectId/keys/:keyId ─────────────────────────────

describe('PATCH /api/v1/projects/:projectId/keys/:keyId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates and returns the key', async () => {
    const updatedKey = { ...stubKey, description: 'Updated description' };

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubKey]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedKey]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${stubProject.id}/keys/${stubKey.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { description: 'Updated description' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { key: typeof updatedKey };
    expect(body.key.description).toBe('Updated description');

    await app.close();
  });

  it('returns 404 when key does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${stubProject.id}/keys/non-existent-key`,
      headers: { authorization: `Bearer ${token}` },
      payload: { description: 'Updated' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${stubProject.id}/keys/${stubKey.id}`,
      payload: { description: 'Updated' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── DELETE /api/v1/projects/:projectId/keys/:keyId ────────────────────────────

describe('DELETE /api/v1/projects/:projectId/keys/:keyId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the key and returns 204', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubKey]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubKey]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}/keys/${stubKey.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('returns 404 when key does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}/keys/non-existent-key`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}/keys/${stubKey.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/projects/:projectId/translations/:locale ──────────────────────

describe('GET /api/v1/projects/:projectId/translations/:locale', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a key/value translation map', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                translationId: stubTranslation.id,
                keyId: stubTranslation.keyId,
                key: stubKey.key,
                locale: 'fr',
                value: 'Se connecter',
                status: 'draft',
                translatedBy: stubUser.id,
                createdAt: stubTranslation.createdAt,
                updatedAt: stubTranslation.updatedAt,
              },
            ]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}/translations/fr`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { translations: Record<string, string> };
    expect(body.translations['auth.login.title']).toBe('Se connecter');

    await app.close();
  });

  it('returns empty translations map when no translations exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}/translations/de`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { translations: Record<string, string> };
    expect(Object.keys(body.translations)).toHaveLength(0);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}/translations/fr`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── PUT /api/v1/projects/:projectId/translations/:locale/:keyId ───────────────

describe('PUT /api/v1/projects/:projectId/translations/:locale/:keyId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('upserts a translation and returns 200', async () => {
    const mockDb = {
      select: vi.fn()
        // findById (key exists check)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubKey]),
            }),
          }),
        })
        // findByKeyAndLocale (existing translation for history)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      insert: vi.fn()
        // upsert translation
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([stubTranslation]),
            }),
          }),
        })
        // insert history
        .mockReturnValueOnce({
          values: vi.fn().mockResolvedValue([]),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${stubProject.id}/translations/fr/${stubKey.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { value: 'Se connecter' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { translation: typeof stubTranslation };
    expect(body.translation.value).toBe('Se connecter');

    await app.close();
  });

  it('returns 400 for an empty translation value', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${stubProject.id}/translations/fr/${stubKey.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { value: '' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 404 when key does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${stubProject.id}/translations/fr/non-existent-key`,
      headers: { authorization: `Bearer ${token}` },
      payload: { value: 'Bonjour' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/projects/${stubProject.id}/translations/fr/${stubKey.id}`,
      payload: { value: 'Se connecter' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── PATCH /api/v1/projects/:projectId/translations/bulk ───────────────────────

describe('PATCH /api/v1/projects/:projectId/translations/bulk', () => {
  beforeEach(() => vi.clearAllMocks());

  it('bulk-updates translations and returns 200', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn()
        // bulkUpsert
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([stubTranslation]),
            }),
          }),
        })
        // insert history
        .mockReturnValueOnce({
          values: vi.fn().mockResolvedValue([]),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${stubProject.id}/translations/bulk`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        translations: [
          { keyId: stubKey.id, locale: 'fr', value: 'Se connecter' },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { updated: typeof stubTranslation[] };
    expect(body.updated).toHaveLength(1);

    await app.close();
  });

  it('returns 400 for an empty translations array', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${stubProject.id}/translations/bulk`,
      headers: { authorization: `Bearer ${token}` },
      payload: { translations: [] },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${stubProject.id}/translations/bulk`,
      payload: { translations: [{ keyId: stubKey.id, locale: 'fr', value: 'test' }] },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── POST /api/v1/projects/:projectId/translations/:locale/:keyId/review ───────

describe('POST /api/v1/projects/:projectId/translations/:locale/:keyId/review', () => {
  beforeEach(() => vi.clearAllMocks());

  it('approves a translation and returns 200', async () => {
    const mockDb = {
      select: vi.fn()
        // findByKeyAndLocale — translation exists
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubTranslation]),
            }),
          }),
        })
        // reviewTranslation: check translation exists
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubTranslation]),
            }),
          }),
        }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...stubTranslation, status: 'approved' }]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubReview]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/translations/fr/${stubKey.id}/review`,
      headers: { authorization: `Bearer ${token}` },
      payload: { action: 'approved', comment: 'LGTM' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { review: typeof stubReview };
    expect(body.review.action).toBe('approved');

    await app.close();
  });

  it('returns 400 for an invalid action', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/translations/fr/${stubKey.id}/review`,
      headers: { authorization: `Bearer ${token}` },
      payload: { action: 'delete' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 404 when translation does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/translations/fr/non-existent-key/review`,
      headers: { authorization: `Bearer ${token}` },
      payload: { action: 'approved' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/translations/fr/${stubKey.id}/review`,
      payload: { action: 'approved' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── POST /api/v1/projects/:projectId/translations/publish ─────────────────────

describe('POST /api/v1/projects/:projectId/translations/publish', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes approved translations and returns the count', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ id: stubTranslation.id }]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...stubTranslation, status: 'published' }]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/translations/publish`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { published: number };
    expect(body.published).toBe(1);

    await app.close();
  });

  it('returns 0 when no approved translations exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/translations/publish`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { published: number };
    expect(body.published).toBe(0);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/translations/publish`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
