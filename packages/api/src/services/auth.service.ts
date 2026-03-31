/**
 * Authentication service — business logic for register, login, and token refresh.
 *
 * All functions are stateless and accept a Drizzle `db` instance plus the
 * Fastify `app` instance (for JWT signing/verification) so that they are easy
 * to unit-test with mocks.
 *
 * @module services/auth.service
 */

import bcrypt from 'bcrypt';
import type { FastifyInstance } from 'fastify';
import type { Database } from '@i18n-platform/database';
import * as userRepo from '../repositories/user.repository.js';

/** Number of bcrypt salt rounds applied to password hashes. */
const BCRYPT_ROUNDS = 12;

/**
 * The shape returned by every auth operation that issues tokens.
 */
export interface AuthResult {
  /** Short-lived JWT access token. */
  accessToken: string;
  /** Long-lived JWT refresh token. */
  refreshToken: string;
  /** Public-facing user data (no password hash). */
  user: {
    id: string;
    email: string;
    name: string;
  };
}

/**
 * Payload encoded inside a refresh token.
 */
interface RefreshPayload {
  sub: string;
  email: string;
  type: 'refresh';
}

/**
 * Signs both an access token and a refresh token for the given user.
 *
 * Access tokens use the global `sign` options configured on the JWT plugin
 * (short expiry). Refresh tokens are signed with a 7-day expiry and carry a
 * `type: 'refresh'` discriminator to prevent them from being used as access
 * tokens.
 *
 * @param app - Fastify instance with `app.jwt` available.
 * @param user - The user for whom tokens are being generated.
 * @param refreshTokenExpiry - Expiry string for the refresh token (e.g. `"7d"`).
 * @returns An object containing both tokens.
 */
function signTokenPair(
  app: FastifyInstance,
  user: { id: string; email: string },
  refreshTokenExpiry: string,
): { accessToken: string; refreshToken: string } {
  const accessToken = app.jwt.sign({ sub: user.id, email: user.email });

  const refreshToken = app.jwt.sign(
    { sub: user.id, email: user.email, type: 'refresh' },
    { expiresIn: refreshTokenExpiry },
  );

  return { accessToken, refreshToken };
}

/**
 * Registers a new user account.
 *
 * Hashes the supplied password with bcrypt, persists the user record, and
 * returns a fresh token pair alongside the sanitised user object.
 *
 * @param db - Drizzle ORM database instance.
 * @param app - Fastify instance (used for JWT signing).
 * @param payload - Registration details.
 * @returns Tokens and public user data.
 * @throws When the email is already registered (database unique-constraint violation).
 *
 * @example
 * ```ts
 * const result = await register(db, app, {
 *   email: 'alice@example.com',
 *   name: 'Alice',
 *   password: 'hunter2',
 * });
 * ```
 */
export async function register(
  db: Database,
  app: FastifyInstance,
  payload: { email: string; name: string; password: string },
): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(payload.password, BCRYPT_ROUNDS);

  const user = await userRepo.create(db, {
    email: payload.email,
    name: payload.name,
    passwordHash,
  });

  const refreshTokenExpiry =
    (app.jwt.options.sign as { expiresIn?: string }).expiresIn ?? '7d';

  const { accessToken, refreshToken } = signTokenPair(
    app,
    { id: user.id, email: user.email },
    refreshTokenExpiry,
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

/**
 * Authenticates an existing user by email and password.
 *
 * Compares the supplied password against the stored bcrypt hash and, on
 * success, returns a fresh token pair.
 *
 * @param db - Drizzle ORM database instance.
 * @param app - Fastify instance (used for JWT signing).
 * @param payload - Login credentials.
 * @returns Tokens and public user data.
 * @throws `{ statusCode: 401 }` when credentials are invalid.
 *
 * @example
 * ```ts
 * const result = await login(db, app, {
 *   email: 'alice@example.com',
 *   password: 'hunter2',
 * });
 * ```
 */
export async function login(
  db: Database,
  app: FastifyInstance,
  payload: { email: string; password: string },
): Promise<AuthResult> {
  const user = await userRepo.findByEmail(db, payload.email);

  const isValid =
    user?.passwordHash != null &&
    (await bcrypt.compare(payload.password, user.passwordHash));

  if (!user || !isValid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const refreshTokenExpiry =
    (app.jwt.options.sign as { expiresIn?: string }).expiresIn ?? '7d';

  const { accessToken, refreshToken } = signTokenPair(
    app,
    { id: user.id, email: user.email },
    refreshTokenExpiry,
  );

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name },
  };
}

/**
 * Issues a new access token from a valid refresh token.
 *
 * Verifies the supplied refresh token, checks that it carries the
 * `type: 'refresh'` discriminator, and returns a fresh token pair.
 *
 * @param app - Fastify instance (used for JWT verification and signing).
 * @param db - Drizzle ORM database instance (used to re-fetch user data).
 * @param token - The refresh token string from the client.
 * @returns A new token pair (both access and refresh tokens are rotated).
 * @throws `{ statusCode: 401 }` when the token is invalid or is not a refresh token.
 *
 * @example
 * ```ts
 * const { accessToken, refreshToken } = await refreshToken(app, db, oldRefreshToken);
 * ```
 */
export async function refreshToken(
  app: FastifyInstance,
  db: Database,
  token: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: RefreshPayload;

  try {
    payload = app.jwt.verify<RefreshPayload>(token);
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), { statusCode: 401 });
  }

  if (payload.type !== 'refresh') {
    throw Object.assign(new Error('Token is not a refresh token'), { statusCode: 401 });
  }

  // Re-fetch from DB to ensure the user still exists.
  const user = await userRepo.findById(db, payload.sub);

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 401 });
  }

  const refreshTokenExpiry =
    (app.jwt.options.sign as { expiresIn?: string }).expiresIn ?? '7d';

  return signTokenPair(app, { id: user.id, email: user.email }, refreshTokenExpiry);
}
