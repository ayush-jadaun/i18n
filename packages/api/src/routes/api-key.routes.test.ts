/**
 * Integration tests for the API key management routes.
 *
 * Uses Fastify's `app.inject()` helper — no HTTP server is started and no real
 * PostgreSQL connection is required. The database is replaced with an
 * in-memory mock via `app.decorate('db', mockDb)`.
 *
 * @module routes/api-key.routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import '../types.js';
import jwtPlugin from '../plugins/jwt.js';
import { apiKeyRoutes } from './api-key.routes.js';
import type { Database } from '@i18n-platform/database';
import type { Config } from '../config.js';

// ── Test configuration ───────────────────────────────────────────────────────

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

// ── Stub data ────────────────────────────────────────────────────────────────

const stubUser = { id: 'user-uuid-1234', email: 'alice@example.com' };
const stubProjectId = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

const stubApiKeyRecord = {
  id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  projectId: stubProjectId,
  name: 'CI Deploy Key',
  keyHash: '$2b$10$fakebcrypthash',
  keyPrefix: 'i18n_abc12345',
  scopes: {
    translations: 'read',
    keys: 'none',
    importExport: 'none',
    mt: 'none',
    publish: 'none',
  },
  environment: 'production',
  expiresAt: null,
  lastUsedAt: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
};

// ── Test app factory ─────────────────────────────────────────────────────────

async function createTestApp(mockDb: Partial<Database> = {}) {
  const app = Fastify({ logger: false });
  app.decorate('db', mockDb as Database);
  await app.register(jwtPlugin, { config: testConfig });
  await app.register(apiKeyRoutes, { prefix: '/api/v1' });
  return app;
}

async function signAccessToken(
  app: Awaited<ReturnType<typeof createTestApp>>,
  user: { id: string; email: string },
): Promise<string> {
  await app.ready();
  return app.jwt.sign({ sub: user.id, email: user.email });
}

// ── POST /api/v1/projects/:projectId/api-keys ───────────────────────────────

describe('POST /api/v1/projects/:projectId/api-keys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an API key and returns the full key only once', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubApiKeyRecord]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProjectId}/api-keys`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'CI Deploy Key',
        environment: 'production',
        scopes: {
          translations: 'read',
          keys: 'none',
          importExport: 'none',
          mt: 'none',
          publish: 'none',
        },
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { key: string; apiKey: Record<string, unknown> };
    expect(body.key).toMatch(/^i18n_[0-9a-f]{64}$/);
    expect(body.apiKey).toBeDefined();
    // The key hash should NOT be in the response
    expect(body.apiKey).not.toHaveProperty('keyHash');

    await app.close();
  });

  it('returns 400 for missing name', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProjectId}/api-keys`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        environment: 'production',
        scopes: {
          translations: 'read',
          keys: 'none',
          importExport: 'none',
          mt: 'none',
          publish: 'none',
        },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('returns 400 for invalid environment', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProjectId}/api-keys`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Bad Key',
        environment: 'invalid-env',
        scopes: {
          translations: 'read',
          keys: 'none',
          importExport: 'none',
          mt: 'none',
          publish: 'none',
        },
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProjectId}/api-keys`,
      payload: {
        name: 'CI Key',
        environment: 'production',
        scopes: {
          translations: 'read',
          keys: 'none',
          importExport: 'none',
          mt: 'none',
          publish: 'none',
        },
      },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/projects/:projectId/api-keys ────────────────────────────────

describe('GET /api/v1/projects/:projectId/api-keys', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists API keys without exposing the hash', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([stubApiKeyRecord]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/api-keys`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { apiKeys: Array<Record<string, unknown>> };
    expect(body.apiKeys).toHaveLength(1);
    expect(body.apiKeys[0]).not.toHaveProperty('keyHash');
    expect(body.apiKeys[0]!.keyPrefix).toBe('i18n_abc12345');

    await app.close();
  });

  it('returns empty array when no keys exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/api-keys`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { apiKeys: unknown[] };
    expect(body.apiKeys).toHaveLength(0);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/api-keys`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── DELETE /api/v1/projects/:projectId/api-keys/:keyId ──────────────────────

describe('DELETE /api/v1/projects/:projectId/api-keys/:keyId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the API key and returns 204', async () => {
    const mockDb = {
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubApiKeyRecord]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProjectId}/api-keys/${stubApiKeyRecord.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('returns 404 when key does not exist', async () => {
    const mockDb = {
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProjectId}/api-keys/non-existent-id`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProjectId}/api-keys/${stubApiKeyRecord.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
