/**
 * Integration tests for the organization and member management routes.
 *
 * Uses Fastify's `app.inject()` helper — no HTTP server is started and no real
 * PostgreSQL connection is required. The database is replaced with an
 * in-memory mock via `app.decorate('db', mockDb)` before routes are
 * registered.
 *
 * @module routes/org.routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import '../types.js';
import jwtPlugin from '../plugins/jwt.js';
import { orgRoutes } from './org.routes.js';
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

/** Stub user that appears in membership queries. */
const stubUser = {
  id: 'user-uuid-1234',
  email: 'alice@example.com',
  name: 'Alice',
  passwordHash: '$2b$12$hashedpassword',
  avatarUrl: null,
  preferences: { theme: 'system', language: 'en', notifications: { email: true, inApp: true } },
  createdAt: new Date('2025-01-01T00:00:00Z'),
};

/** A second user for invite tests. */
const stubInvitee = {
  id: 'user-uuid-5678',
  email: 'bob@example.com',
  name: 'Bob',
  passwordHash: '$2b$12$hashedpassword',
  avatarUrl: null,
  preferences: { theme: 'system', language: 'en', notifications: { email: true, inApp: true } },
  createdAt: new Date('2025-01-01T00:00:00Z'),
};

/** Stub organization row. */
const stubOrg = {
  id: 'org-uuid-1234',
  name: 'Acme Corp',
  slug: 'acme',
  settings: {},
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

/** Stub org_member row (Alice is the owner). */
const stubMember = {
  id: 'member-uuid-1234',
  orgId: 'org-uuid-1234',
  userId: 'user-uuid-1234',
  role: 'owner',
  permissions: { projects: {} },
  joinedAt: new Date('2025-01-01T00:00:00Z'),
  name: 'Alice',
  email: 'alice@example.com',
};

/** Stub member row for the invitee. */
const stubInviteeMember = {
  id: 'member-uuid-5678',
  orgId: 'org-uuid-1234',
  userId: 'user-uuid-5678',
  role: 'developer',
  permissions: { projects: {} },
  joinedAt: new Date('2025-01-01T00:00:00Z'),
  name: 'Bob',
  email: 'bob@example.com',
};

// ── Test app factory ──────────────────────────────────────────────────────────

/**
 * Builds a minimal Fastify instance wired with the JWT plugin and org routes.
 * The `db` decoration is replaced with `mockDb` so no PostgreSQL is needed.
 *
 * @param mockDb - Partial mock of the Drizzle database instance.
 * @returns An initialised (but not listening) Fastify app.
 */
async function createTestApp(mockDb: Partial<Database> = {}) {
  const app = Fastify({ logger: false });

  app.decorate('db', mockDb as Database);

  await app.register(jwtPlugin, { config: testConfig });
  await app.register(orgRoutes, { prefix: '/api/v1/orgs' });

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

// ── POST /api/v1/orgs ─────────────────────────────────────────────────────────

describe('POST /api/v1/orgs', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates an organization and returns 201', async () => {
    const mockDb = {
      // findBySlug — no existing org with this slug
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      // create org + addMember
      insert: vi.fn()
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([stubOrg]),
          }),
        })
        .mockReturnValueOnce({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([stubMember]),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orgs',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Acme Corp', slug: 'acme' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { organization: typeof stubOrg };
    expect(body.organization.name).toBe('Acme Corp');
    expect(body.organization.slug).toBe('acme');

    await app.close();
  });

  it('returns 400 for invalid payload', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orgs',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '', slug: 'invalid slug with spaces' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('returns 409 when slug is already taken', async () => {
    const mockDb = {
      // findBySlug — existing org found
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubOrg]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orgs',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Acme Corp', slug: 'acme' },
    });

    expect(response.statusCode).toBe(409);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/orgs',
      payload: { name: 'Acme Corp', slug: 'acme' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/orgs ──────────────────────────────────────────────────────────

describe('GET /api/v1/orgs', () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the authenticated user's organizations", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stubOrg]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orgs',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { organizations: typeof stubOrg[] };
    expect(body.organizations).toHaveLength(1);
    expect(body.organizations[0]?.name).toBe('Acme Corp');

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orgs',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/orgs/:orgId ───────────────────────────────────────────────────

describe('GET /api/v1/orgs/:orgId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the organization when found', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubOrg]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orgs/${stubOrg.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { organization: typeof stubOrg };
    expect(body.organization.id).toBe(stubOrg.id);

    await app.close();
  });

  it('returns 404 when organization does not exist', async () => {
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
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orgs/non-existent-id',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orgs/${stubOrg.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── PATCH /api/v1/orgs/:orgId ─────────────────────────────────────────────────

describe('PATCH /api/v1/orgs/:orgId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates and returns the organization', async () => {
    const updatedOrg = { ...stubOrg, name: 'Acme International' };

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubOrg]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedOrg]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${stubOrg.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Acme International' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { organization: typeof stubOrg };
    expect(body.organization.name).toBe('Acme International');

    await app.close();
  });

  it('returns 400 for invalid payload', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${stubOrg.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 404 when organization does not exist', async () => {
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
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/orgs/non-existent-id',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'New Name' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${stubOrg.id}`,
      payload: { name: 'New Name' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── DELETE /api/v1/orgs/:orgId ────────────────────────────────────────────────

describe('DELETE /api/v1/orgs/:orgId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes the organization and returns 204', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([stubOrg]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubOrg]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/orgs/${stubOrg.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('returns 404 when organization does not exist', async () => {
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
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/orgs/non-existent-id',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/orgs/${stubOrg.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── POST /api/v1/orgs/:orgId/members/invite ───────────────────────────────────

describe('POST /api/v1/orgs/:orgId/members/invite', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invites a member and returns 201', async () => {
    const mockDb = {
      select: vi.fn()
        // findByEmail — find invitee
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubInvitee]),
            }),
          }),
        })
        // findMembership — not yet a member
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubInviteeMember]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${stubOrg.id}/members/invite`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'bob@example.com', role: 'developer' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as { member: typeof stubInviteeMember };
    expect(body.member.role).toBe('developer');

    await app.close();
  });

  it('returns 400 for invalid payload', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${stubOrg.id}/members/invite`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'not-an-email', role: 'superadmin' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 404 when the invitee email does not exist', async () => {
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
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${stubOrg.id}/members/invite`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'unknown@example.com', role: 'developer' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 409 when user is already a member', async () => {
    const mockDb = {
      select: vi.fn()
        // findByEmail — find invitee
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubInvitee]),
            }),
          }),
        })
        // findMembership — already a member
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([stubInviteeMember]),
            }),
          }),
        }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${stubOrg.id}/members/invite`,
      headers: { authorization: `Bearer ${token}` },
      payload: { email: 'bob@example.com', role: 'developer' },
    });

    expect(response.statusCode).toBe(409);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/orgs/${stubOrg.id}/members/invite`,
      payload: { email: 'bob@example.com', role: 'developer' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── GET /api/v1/orgs/:orgId/members ──────────────────────────────────────────

describe('GET /api/v1/orgs/:orgId/members', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists all members of the organization', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stubMember]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orgs/${stubOrg.id}/members`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { members: typeof stubMember[] };
    expect(body.members).toHaveLength(1);
    expect(body.members[0]?.email).toBe('alice@example.com');

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/orgs/${stubOrg.id}/members`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── PATCH /api/v1/orgs/:orgId/members/:memberId ───────────────────────────────

describe('PATCH /api/v1/orgs/:orgId/members/:memberId', () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates a member's role and returns 200", async () => {
    const updatedMember = { ...stubMember, role: 'admin' };

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stubMember]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedMember]),
          }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${stubOrg.id}/members/${stubMember.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role: 'admin' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { member: typeof updatedMember };
    expect(body.member.role).toBe('admin');

    await app.close();
  });

  it('returns 400 for an invalid role', async () => {
    const app = await createTestApp();
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${stubOrg.id}/members/${stubMember.id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role: 'superadmin' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });

  it('returns 404 when member is not in this org', async () => {
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
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${stubOrg.id}/members/non-existent-member`,
      headers: { authorization: `Bearer ${token}` },
      payload: { role: 'admin' },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'PATCH',
      url: `/api/v1/orgs/${stubOrg.id}/members/${stubMember.id}`,
      payload: { role: 'admin' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});

// ── DELETE /api/v1/orgs/:orgId/members/:memberId ──────────────────────────────

describe('DELETE /api/v1/orgs/:orgId/members/:memberId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('removes a member and returns 204', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([stubMember]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubMember]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/orgs/${stubOrg.id}/members/${stubMember.id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(204);

    await app.close();
  });

  it('returns 404 when member is not in this org', async () => {
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
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/orgs/${stubOrg.id}/members/non-existent-member`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });

  it('returns 401 without a token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'DELETE',
      url: `/api/v1/orgs/${stubOrg.id}/members/${stubMember.id}`,
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });
});
