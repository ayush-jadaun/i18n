/**
 * Integration tests for the project, locale, and namespace management routes.
 *
 * Uses Fastify's `app.inject()` helper — no HTTP server is started and no real
 * PostgreSQL connection is required. The database is replaced with an
 * in-memory mock via `app.decorate('db', mockDb)` before routes are
 * registered.
 *
 * @module routes/project.routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import '../types.js';
import jwtPlugin from '../plugins/jwt.js';
import { projectRoutes } from './project.routes.js';
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

/** Stub user that owns the project. */
const stubUser = {
  id: 'user-uuid-1234',
  email: 'alice@example.com',
};

/** Stub organization row. */
const stubOrg = {
  id: 'org-uuid-1234',
};

/** Stub project row. */
const stubProject = {
  id: 'project-uuid-1234',
  orgId: 'org-uuid-1234',
  name: 'Web App',
  slug: 'web-app',
  defaultLocale: 'en',
  deliveryMode: 'cdn',
  settings: { autoTranslateOnPush: false, requireReview: true, minCoverageForPublish: 0 },
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

/** Stub project_locale row. */
const stubLocale = {
  id: 'locale-uuid-1234',
  projectId: 'project-uuid-1234',
  locale: 'fr',
  enabled: true,
  coveragePercent: 0,
  lastSyncedAt: null,
};

/** Stub namespace row. */
const stubNamespace = {
  id: 'ns-uuid-1234',
  projectId: 'project-uuid-1234',
  name: 'common',
  description: 'Common shared strings',
  sortOrder: 0,
};

// ── Test app factory ──────────────────────────────────────────────────────────

/**
 * Builds a minimal Fastify instance wired with the JWT plugin and project routes.
 * The `db` decoration is replaced with `mockDb` so no PostgreSQL is needed.
 *
 * @param mockDb - Partial mock of the Drizzle database instance.
 * @returns An initialised (but not listening) Fastify app.
 */
async function createTestApp(mockDb: Partial<Database> = {}) {
  const app = Fastify({ logger: false });

  app.decorate('db', mockDb as Database);

  await app.register(jwtPlugin, { config: testConfig });
  await app.register(projectRoutes, { prefix: '/api/v1' });

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

// ── POST /api/v1/orgs/:orgId/projects ─────────────────────────────────────────

describe('POST /api/v1/orgs/:orgId/projects', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a project and returns 201', async () => {
    const mockDb = {
      // findByOrgAndSlug — no existing project
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      // create project, addLocale (x2), create namespace
      insert: vi.fn()
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([stubProject]),
          }),
        })
        .mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([stubLocale]),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${stubOrg.id}/projects`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Web App',
        slug: 'web-app',
        defaultLocale: 'en',
        supportedLocales: ['en', 'fr'],
        delivery: 'cdn',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { project: typeof stubProject };
    expect(body.project.name).toBe('Web App');
    expect(body.project.slug).toBe('web-app');

    await app.close();
  });

  it('returns 400 for invalid payload', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${stubOrg.id}/projects`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '', slug: 'invalid slug spaces', defaultLocale: 'not-valid-locale' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('returns 409 when slug is already taken in the org', async () => {
    const mockDb = {
      // findByOrgAndSlug — existing project found
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubProject]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${stubOrg.id}/projects`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Web App',
        slug: 'web-app',
        defaultLocale: 'en',
        supportedLocales: ['en'],
        delivery: 'cdn',
      },
    });

    expect(response.statusCode).toBe(409);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${stubOrg.id}/projects`,
      payload: { name: 'Web App', slug: 'web-app', defaultLocale: 'en', supportedLocales: ['en'], delivery: 'cdn' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/orgs/:orgId/projects ──────────────────────────────────────────

describe('GET /api/v1/orgs/:orgId/projects', () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the org's projects", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([stubProject]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orgs/${stubOrg.id}/projects`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { projects: typeof stubProject[] };
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]?.name).toBe('Web App');

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orgs/${stubOrg.id}/projects`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/projects/:projectId ───────────────────────────────────────────

describe('GET /api/v1/projects/:projectId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the project with locales and namespaces', async () => {
    const mockDb = {
      select: vi.fn()
        // findById — project found
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubProject]),
            }),
          }),
        })
        // findByProject (locales)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stubLocale]),
          }),
        })
        // findByProject (namespaces)
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stubNamespace]),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      project: typeof stubProject & { locales: typeof stubLocale[]; namespaces: typeof stubNamespace[] };
    };
    expect(body.project.id).toBe(stubProject.id);
    expect(body.project.locales).toHaveLength(1);
    expect(body.project.namespaces).toHaveLength(1);

    await app.close();
  });

  it('returns 404 when project does not exist', async () => {
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
      url: '/api/v1/projects/non-existent-id',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${stubProject.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── PATCH /api/v1/projects/:projectId ─────────────────────────────────────────

describe('PATCH /api/v1/projects/:projectId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates and returns the project', async () => {
    const updatedProject = { ...stubProject, name: 'Mobile App' };

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubProject]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedProject]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${stubProject.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Mobile App' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { project: typeof stubProject };
    expect(body.project.name).toBe('Mobile App');

    await app.close();
  });

  it('returns 404 when project does not exist', async () => {
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
      url: '/api/v1/projects/non-existent-id',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Mobile App' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${stubProject.id}`,
      payload: { name: 'Mobile App' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── DELETE /api/v1/projects/:projectId ────────────────────────────────────────

describe('DELETE /api/v1/projects/:projectId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the project and returns 204', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubProject]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubProject]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('returns 404 when project does not exist', async () => {
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
      url: '/api/v1/projects/non-existent-id',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── POST /api/v1/projects/:projectId/locales ──────────────────────────────────

describe('POST /api/v1/projects/:projectId/locales', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds a locale and returns 201', async () => {
    const mockDb = {
      select: vi.fn()
        // findById — project found
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubProject]),
            }),
          }),
        })
        // findByProject — no existing locales
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubLocale]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/locales`,
      headers: { authorization: `Bearer ${token}` },
      payload: { locale: 'fr' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { locale: typeof stubLocale };
    expect(body.locale.locale).toBe('fr');

    await app.close();
  });

  it('returns 400 for an invalid locale', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/locales`,
      headers: { authorization: `Bearer ${token}` },
      payload: { locale: 'not_a_locale!!!' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 409 when locale is already registered', async () => {
    const mockDb = {
      select: vi.fn()
        // findById — project found
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubProject]),
            }),
          }),
        })
        // findByProject — locale already exists
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stubLocale]),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/locales`,
      headers: { authorization: `Bearer ${token}` },
      payload: { locale: 'fr' },
    });

    expect(response.statusCode).toBe(409);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/locales`,
      payload: { locale: 'fr' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── DELETE /api/v1/projects/:projectId/locales/:localeId ──────────────────────

describe('DELETE /api/v1/projects/:projectId/locales/:localeId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes a locale and returns 204', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([stubLocale]),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubLocale]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}/locales/${stubLocale.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('returns 404 when locale is not found for this project', async () => {
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
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}/locales/non-existent-locale`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}/locales/${stubLocale.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── POST /api/v1/projects/:projectId/namespaces ───────────────────────────────

describe('POST /api/v1/projects/:projectId/namespaces', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a namespace and returns 201', async () => {
    const mockDb = {
      select: vi.fn()
        // findById — project found
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubProject]),
            }),
          }),
        })
        // findByProject — no existing namespace with this name
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubNamespace]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/namespaces`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'common', description: 'Common shared strings' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { namespace: typeof stubNamespace };
    expect(body.namespace.name).toBe('common');

    await app.close();
  });

  it('returns 400 for missing name', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/namespaces`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 409 when namespace name already exists', async () => {
    const mockDb = {
      select: vi.fn()
        // findById — project found
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubProject]),
            }),
          }),
        })
        // findByProject — namespace already exists
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stubNamespace]),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/namespaces`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'common' },
    });

    expect(response.statusCode).toBe(409);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${stubProject.id}/namespaces`,
      payload: { name: 'auth' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── PATCH /api/v1/projects/:projectId/namespaces/:nsId ────────────────────────

describe('PATCH /api/v1/projects/:projectId/namespaces/:nsId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates a namespace and returns 200', async () => {
    const updatedNs = { ...stubNamespace, description: 'Updated description' };

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubNamespace]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedNs]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${stubProject.id}/namespaces/${stubNamespace.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { description: 'Updated description' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { namespace: typeof updatedNs };
    expect(body.namespace.description).toBe('Updated description');

    await app.close();
  });

  it('returns 404 when namespace does not exist', async () => {
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
      url: `/api/v1/projects/${stubProject.id}/namespaces/non-existent-ns`,
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
      url: `/api/v1/projects/${stubProject.id}/namespaces/${stubNamespace.id}`,
      payload: { description: 'Updated' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── DELETE /api/v1/projects/:projectId/namespaces/:nsId ───────────────────────

describe('DELETE /api/v1/projects/:projectId/namespaces/:nsId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes a namespace and returns 204', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubNamespace]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubNamespace]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, stubUser);

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}/namespaces/${stubNamespace.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('returns 404 when namespace does not exist', async () => {
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
      url: `/api/v1/projects/${stubProject.id}/namespaces/non-existent-ns`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${stubProject.id}/namespaces/${stubNamespace.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
