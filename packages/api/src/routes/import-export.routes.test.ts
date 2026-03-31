/**
 * Integration tests for the import/export routes.
 *
 * Uses Fastify's `app.inject()` helper — no HTTP server is started and no real
 * PostgreSQL connection is required. The database is replaced with an
 * in-memory mock via `app.decorate('db', mockDb)` before routes are
 * registered.
 *
 * @module routes/import-export.routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import '../types.js';
import jwtPlugin from '../plugins/jwt.js';
import { importExportRoutes } from './import-export.routes.js';
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

const stubKey = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  projectId: stubProjectId,
  namespaceId: null,
  key: 'hello',
  defaultValue: 'Hello',
  description: '',
  maxLength: null,
  metadata: {},
  isArchived: false,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

const stubTranslation = {
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  keyId: stubKey.id,
  locale: 'fr',
  value: 'Bonjour',
  status: 'draft',
  translatedBy: 'import',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

// ── Test app factory ─────────────────────────────────────────────────────────

async function createTestApp(mockDb: Partial<Database> = {}) {
  const app = Fastify({ logger: false });
  app.decorate('db', mockDb as Database);
  await app.register(jwtPlugin, { config: testConfig });
  await app.register(importExportRoutes, { prefix: '/api/v1' });
  return app;
}

async function signAccessToken(
  app: Awaited<ReturnType<typeof createTestApp>>,
  user: { id: string; email: string },
): Promise<string> {
  await app.ready();
  return app.jwt.sign({ sub: user.id, email: user.email });
}

// ── POST /api/v1/projects/:projectId/import ─────────────────────────────────

describe('POST /api/v1/projects/:projectId/import', () => {
  beforeEach(() => vi.clearAllMocks());

  it('imports a flat JSON file and returns counts', async () => {
    const mockDb = {
      // createMany (keyRepo) — insert keys
      insert: vi.fn()
        // First call: createMany for keys
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            onConflictDoNothing: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([stubKey]),
            }),
          }),
        })
        // Second call: upsert translation
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([stubTranslation]),
            }),
          }),
        }),
      select: vi.fn()
        // findByProjectAndKey
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubKey]),
            }),
          }),
        })
        // findByKeyAndLocale — no existing translation
        .mockReturnValueOnce({
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
      url: `/api/v1/projects/${stubProjectId}/import`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        locale: 'fr',
        format: 'flat-json',
        content: '{"hello": "Bonjour"}',
        conflictStrategy: 'overwrite',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { created: number; updated: number; skipped: number };
    expect(body.created).toBe(1);
    expect(body.updated).toBe(0);
    expect(body.skipped).toBe(0);

    await app.close();
  });

  it('skips existing translations with skip strategy', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([stubKey]),
          }),
        }),
      }),
      select: vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubKey]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubTranslation]),
            }),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProjectId}/import`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        locale: 'fr',
        format: 'flat-json',
        content: '{"hello": "Salut"}',
        conflictStrategy: 'skip',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { created: number; updated: number; skipped: number };
    expect(body.skipped).toBe(1);
    expect(body.created).toBe(0);

    await app.close();
  });

  it('returns 409 with error strategy on conflict', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([stubKey]),
          }),
        }),
      }),
      select: vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubKey]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubTranslation]),
            }),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProjectId}/import`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        locale: 'fr',
        format: 'flat-json',
        content: '{"hello": "Salut"}',
        conflictStrategy: 'error',
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('IMPORT_CONFLICT');

    await app.close();
  });

  it('returns 400 for invalid format', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProjectId}/import`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        locale: 'fr',
        format: 'invalid-format',
        content: '{"hello": "Bonjour"}',
        conflictStrategy: 'overwrite',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('returns 400 for empty content', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProjectId}/import`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        locale: 'fr',
        format: 'flat-json',
        content: '',
        conflictStrategy: 'overwrite',
      },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProjectId}/import`,
      payload: {
        locale: 'fr',
        format: 'flat-json',
        content: '{"hello": "Bonjour"}',
        conflictStrategy: 'overwrite',
      },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/projects/:projectId/export ──────────────────────────────────

describe('GET /api/v1/projects/:projectId/export', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports translations as flat JSON', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                translationId: stubTranslation.id,
                keyId: stubKey.id,
                key: 'hello',
                locale: 'fr',
                value: 'Bonjour',
                status: 'draft',
                translatedBy: 'import',
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
      url: `/api/v1/projects/${stubProjectId}/export?locale=fr&format=flat-json`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { content: string; fileExtension: string; entryCount: number };
    expect(body.entryCount).toBe(1);
    expect(body.fileExtension).toBe('.json');
    const parsed = JSON.parse(body.content) as Record<string, string>;
    expect(parsed.hello).toBe('Bonjour');

    await app.close();
  });

  it('returns 400 when locale is missing', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/export?format=flat-json`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 400 when format is missing', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/export?locale=fr`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/export?locale=fr&format=flat-json`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
