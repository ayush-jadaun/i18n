/**
 * Authentication routes for the i18n-platform API.
 *
 * Mounts under `/api/v1/auth` and exposes four endpoints:
 *
 * - `POST /register` — create a new account and receive tokens
 * - `POST /login`    — sign in with credentials and receive tokens
 * - `POST /refresh`  — exchange a refresh token for a new token pair
 * - `GET  /me`       — return the currently authenticated user's profile
 *
 * All request bodies are validated with Zod via `@i18n-platform/core` schemas.
 * The `/me` endpoint is guarded by the {@link authenticate} preHandler.
 *
 * @module routes/auth.routes
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CreateUserSchema, LoginSchema } from '@i18n-platform/core';
import { authenticate } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import * as userRepo from '../repositories/user.repository.js';

/** Request body schema for the refresh endpoint. */
const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

/**
 * Registers all `/api/v1/auth/*` routes on the Fastify instance.
 *
 * This function is registered as an `async` Fastify plugin (route group)
 * and is mounted in `app.ts` using `app.register(authRoutes, { prefix: '/api/v1/auth' })`.
 *
 * @param app - The Fastify application instance (with `app.db` decorated).
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/auth/register
   *
   * Creates a new user account, hashes the password, and returns an access
   * token + refresh token pair alongside the new user's public profile.
   *
   * @requestBody `{ email, name, password }`
   * @returns `{ accessToken, refreshToken, user: { id, email, name } }`
   */
  app.post('/register', async (request, reply) => {
    const parseResult = CreateUserSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await authService.register(app.db, app, parseResult.data);
      return reply.status(201).send(result);
    } catch (err: unknown) {
      const cause = err as { code?: string; statusCode?: number };

      // Postgres unique-constraint violation on the email column
      if (cause.code === '23505') {
        return reply.status(409).send({
          error: { code: 'EMAIL_TAKEN', message: 'An account with that email already exists' },
        });
      }

      throw err;
    }
  });

  /**
   * POST /api/v1/auth/login
   *
   * Authenticates an existing user by email and password. Returns a fresh
   * access token + refresh token pair on success.
   *
   * @requestBody `{ email, password }`
   * @returns `{ accessToken, refreshToken, user: { id, email, name } }`
   */
  app.post('/login', async (request, reply) => {
    const parseResult = LoginSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await authService.login(app.db, app, parseResult.data);
      return reply.status(200).send(result);
    } catch (err: unknown) {
      const cause = err as { statusCode?: number; message?: string };

      if (cause.statusCode === 401) {
        return reply.status(401).send({
          error: { code: 'INVALID_CREDENTIALS', message: cause.message ?? 'Invalid credentials' },
        });
      }

      throw err;
    }
  });

  /**
   * POST /api/v1/auth/refresh
   *
   * Exchanges a valid refresh token for a new access token + refresh token
   * pair (token rotation). The old refresh token is no longer valid after
   * this call succeeds.
   *
   * @requestBody `{ refreshToken }`
   * @returns `{ accessToken, refreshToken }`
   */
  app.post('/refresh', async (request, reply) => {
    const parseResult = RefreshSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const tokens = await authService.refreshToken(app, app.db, parseResult.data.refreshToken);
      return reply.status(200).send(tokens);
    } catch (err: unknown) {
      const cause = err as { statusCode?: number; message?: string };

      if (cause.statusCode === 401) {
        return reply.status(401).send({
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: cause.message ?? 'Invalid or expired refresh token',
          },
        });
      }

      throw err;
    }
  });

  /**
   * GET /api/v1/auth/me
   *
   * Returns the profile of the currently authenticated user. Requires a
   * valid access token in the `Authorization: Bearer <token>` header.
   *
   * @returns `{ user: { id, email, name } }`
   */
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await userRepo.findById(app.db, request.user.id);

    if (!user) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    return reply.status(200).send({
      user: { id: user.id, email: user.email, name: user.name },
    });
  });
}
