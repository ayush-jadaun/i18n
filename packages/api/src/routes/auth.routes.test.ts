/**
 * Integration tests for the auth routes.
 *
 * Uses Fastify's `app.inject()` helper — no HTTP server is started and no real
 * PostgreSQL connection is required. The database is replaced with an
 * in-memory mock via `app.decorate('db', mockDb)` before routes are
 * registered.
 *
 * @module routes/auth.routes.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import '../types.js';
import jwtPlugin from '../plugins/jwt.js';
import { authRoutes } from './auth.routes.js';
import type { Database } from '@i18n-platform/database';
import type { Config } from '../config.js';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2b$12$hashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

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

/** A stubbed user row matching the DB `User` shape. */
const stubUser = {
  id: 'user-uuid-1234',
  email: 'alice@example.com',
  name: 'Alice',
  passwordHash: '$2b$12$hashedpassword',
  avatarUrl: null,
  preferences: { theme: 'system', language: 'en', notifications: { email: true, inApp: true } },
  createdAt: new Date('2025-01-01T00:00:00Z'),
};

// ── Test app factory ──────────────────────────────────────────────────────────

/**
 * Builds a minimal Fastify instance wired with the JWT plugin and auth routes.
 * The `db` decoration is replaced with `mockDb` so no PostgreSQL is needed.
 *
 * @param mockDb - Partial mock of the Drizzle database instance.
 * @returns An initialised (but not listening) Fastify app.
 */
async function createTestApp(mockDb: Partial<Database> = {}) {
  const app = Fastify({ logger: false });

  // Decorate with the mock DB before routes are registered.
  app.decorate('db', mockDb as Database);

  // Register real JWT plugin — token signing/verification is real.
  await app.register(jwtPlugin, { config: testConfig });

  // Register auth routes under the standard prefix.
  await app.register(authRoutes, { prefix: '/api/v1/auth' });

  return app;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/**
 * Signs a valid refresh token for the given user.
 */
async function signRefreshToken(
  app: Awaited<ReturnType<typeof createTestApp>>,
  user: { id: string; email: string },
): Promise<string> {
  await app.ready();
  return app.jwt.sign({ sub: user.id, email: user.email, type: 'refresh' }, { expiresIn: '7d' });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('creates a new user and returns tokens', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([stubUser]),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'alice@example.com', name: 'Alice', password: 'password123' },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; name: string };
    };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user).toEqual({ id: stubUser.id, email: stubUser.email, name: stubUser.name });

    await app.close();
  });

  it('returns 400 for invalid request body', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'not-an-email', name: '', password: 'short' },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');

    await app.close();
  });

  it('returns 409 when email is already taken', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(
            Object.assign(new Error('unique violation'), { code: '23505' }),
          ),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'alice@example.com', name: 'Alice', password: 'password123' },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('EMAIL_TAKEN');

    await app.close();
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([stubUser]) }),
        }),
      }),
    };

    // bcrypt.compare is mocked to return true by default.
    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'alice@example.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; name: string };
    };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.email).toBe('alice@example.com');

    await app.close();
  });

  it('returns 401 for unknown email', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'unknown@example.com', password: 'password123' },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body) as { error: { code: string } };
    expect(body.error.code).toBe('INVALID_CREDENTIALS');

    await app.close();
  });

  it('returns 401 for wrong password', async () => {
    const bcrypt = await import('bcrypt');
    vi.mocked(bcrypt.default.compare).mockResolvedValueOnce(false as never);

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([stubUser]) }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'alice@example.com', password: 'wrongpassword' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 400 for missing password field', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'alice@example.com' },
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('issues a new token pair for a valid refresh token', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([stubUser]) }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signRefreshToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: token },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { accessToken: string; refreshToken: string };
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();

    await app.close();
  });

  it('returns 401 for an access token used as a refresh token', async () => {
    const app = await createTestApp();
    const accessToken = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: accessToken },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 401 for a tampered token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: 'eyJhbGciOiJIUzI1NiJ9.dGFtcGVyZWQ.invalid' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 400 when refreshToken field is missing', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {},
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the authenticated user profile', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([stubUser]) }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: stubUser.id, email: stubUser.email });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { user: { id: string; email: string; name: string } };
    expect(body.user).toEqual({ id: stubUser.id, email: stubUser.email, name: stubUser.name });

    await app.close();
  });

  it('returns 401 when no token is provided', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 401 for an invalid token', async () => {
    const app = await createTestApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: 'Bearer invalid.token.here' },
    });

    expect(response.statusCode).toBe(401);

    await app.close();
  });

  it('returns 404 when the token is valid but the user no longer exists', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    };

    const app = await createTestApp(mockDb as unknown as Partial<Database>);
    const token = await signAccessToken(app, { id: 'deleted-user-id', email: 'gone@example.com' });

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(404);

    await app.close();
  });
});

describe('Reset mocks between tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bcrypt mock is still active after clear', async () => {
    const bcrypt = await import('bcrypt');
    // Restore the default mock behaviour (compare returns true).
    vi.mocked(bcrypt.default.compare).mockResolvedValue(true as never);
    expect(bcrypt.default.compare).toBeDefined();
  });
});
