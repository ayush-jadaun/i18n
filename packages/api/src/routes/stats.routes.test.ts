/**
 * Integration tests for the statistics and audit log routes.
 *
 * Uses Fastify's `app.inject()` helper — no HTTP server is started and no real
 * PostgreSQL connection is required. The database is replaced with an
 * in-memory mock via `app.decorate('db', mockDb)`.
 *
 * @module routes/stats.routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import '../types.js';
import jwtPlugin from '../plugins/jwt.js';
import { statsRoutes } from './stats.routes.js';
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
const stubOrgId = 'e5f6a7b8-c9d0-1234-efab-567890123456';

const stubAuditEntry = {
  id: 'f6a7b8c9-d0e1-2345-fabc-678901234567',
  orgId: stubOrgId,
  projectId: stubProjectId,
  userId: stubUser.id,
  action: 'translation.approve',
  resourceType: 'translation',
  resourceId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  oldValue: null,
  newValue: null,
  ipAddress: '127.0.0.1',
  createdAt: new Date('2025-01-01T00:00:00Z'),
};

// ── Test app factory ─────────────────────────────────────────────────────────

async function createTestApp(mockDb: Partial<Database> = {}) {
  const app = Fastify({ logger: false });
  app.decorate('db', mockDb as Database);
  await app.register(jwtPlugin, { config: testConfig });
  await app.register(statsRoutes, { prefix: '/api/v1' });
  return app;
}

async function signAccessToken(
  app: Awaited<ReturnType<typeof createTestApp>>,
  user: { id: string; email: string },
): Promise<string> {
  await app.ready();
  return app.jwt.sign({ sub: user.id, email: user.email });
}

// ── GET /api/v1/projects/:projectId/stats ───────────────────────────────────

describe('GET /api/v1/projects/:projectId/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns project statistics with locale coverage', async () => {
    const mockDb = {
      select: vi.fn()
        // countByProject (total keys)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 10 }]),
          }),
        })
        // findByProject (project locales)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 'loc-1', projectId: stubProjectId, locale: 'fr', enabled: true, coveragePercent: 0, lastSyncedAt: null },
            ]),
          }),
        })
        // translation status breakdown for locale
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                groupBy: vi.fn().mockResolvedValue([
                  { status: 'draft', count: 5 },
                  { status: 'approved', count: 3 },
                ]),
              }),
            }),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/stats`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      projectId: string;
      totalKeys: number;
      locales: Array<{ locale: string; translatedCount: number; coveragePercent: number }>;
    };
    expect(body.projectId).toBe(stubProjectId);
    expect(body.totalKeys).toBe(10);
    expect(body.locales).toHaveLength(1);
    expect(body.locales[0]!.locale).toBe('fr');
    expect(body.locales[0]!.translatedCount).toBe(8);
    expect(body.locales[0]!.coveragePercent).toBe(80);

    await app.close();
  });

  it('returns zero stats for project with no keys', async () => {
    const mockDb = {
      select: vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/stats`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { totalKeys: number; locales: unknown[] };
    expect(body.totalKeys).toBe(0);
    expect(body.locales).toHaveLength(0);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/stats`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/orgs/:orgId/stats ───────────────────────────────────────────

describe('GET /api/v1/orgs/:orgId/stats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns aggregate org stats', async () => {
    const stubProject = {
      id: stubProjectId,
      orgId: stubOrgId,
      name: 'Web App',
      slug: 'web-app',
      defaultLocale: 'en',
      deliveryMode: 'cdn',
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDb = {
      select: vi.fn()
        // findByOrgId (projects)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stubProject]),
          }),
        })
        // getProjectStats: countByProject
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        })
        // getProjectStats: findByProject (locales)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orgs/${stubOrgId}/stats`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      orgId: string;
      totalProjects: number;
      totalKeys: number;
    };
    expect(body.orgId).toBe(stubOrgId);
    expect(body.totalProjects).toBe(1);
    expect(body.totalKeys).toBe(5);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orgs/${stubOrgId}/stats`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/projects/:projectId/audit ───────────────────────────────────

describe('GET /api/v1/projects/:projectId/audit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated audit entries', async () => {
    const mockDb = {
      select: vi.fn()
        // findByProject (entries)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([stubAuditEntry]),
                }),
              }),
            }),
          }),
        })
        // count
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
      url: `/api/v1/projects/${stubProjectId}/audit?offset=0&limit=10`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      entries: Array<Record<string, unknown>>;
      total: number;
    };
    expect(body.entries).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.entries[0]!.action).toBe('translation.approve');

    await app.close();
  });

  it('returns empty results when no audit entries exist', async () => {
    const mockDb = {
      select: vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/audit`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { entries: unknown[]; total: number };
    expect(body.entries).toHaveLength(0);
    expect(body.total).toBe(0);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProjectId}/audit`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
