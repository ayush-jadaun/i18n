/**
 * API key management routes for the i18n-platform API.
 *
 * Mounts under `/api/v1` and exposes three endpoints:
 *
 * - `POST   /projects/:projectId/api-keys`         — Create an API key
 * - `GET    /projects/:projectId/api-keys`          — List API keys for a project
 * - `DELETE /projects/:projectId/api-keys/:keyId`   — Revoke (delete) an API key
 *
 * On creation, a random key is generated (`i18n_<64-hex-chars>`), hashed with
 * bcrypt for storage, and the full key is returned ONLY in the creation
 * response. Subsequent list requests only show the key prefix.
 *
 * All endpoints require a valid JWT access token (`Authorization: Bearer <token>`).
 *
 * @module routes/api-key.routes
 */

import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { CreateApiKeySchema } from '@i18n-platform/core';
import { authenticate } from '../middleware/auth.js';
import * as apiKeyRepo from '../repositories/api-key.repository.js';

/** Number of bcrypt salt rounds used to hash API keys. */
const BCRYPT_ROUNDS = 10;

/** Length of the key prefix stored for identification (characters after 'i18n_'). */
const PREFIX_LENGTH = 8;

/**
 * Registers API key management routes on the Fastify instance.
 *
 * This function is registered as an async Fastify plugin and is mounted in
 * `app.ts` using `app.register(apiKeyRoutes, { prefix: '/api/v1' })`.
 *
 * @param app - The Fastify application instance (with `app.db` decorated).
 */
export async function apiKeyRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication.
  app.addHook('preHandler', authenticate);

  /**
   * POST /api/v1/projects/:projectId/api-keys
   *
   * Generates a new API key for the project. The full key is returned ONLY
   * in this response — it is not stored and cannot be retrieved again.
   *
   * @requestBody `{ name, environment, scopes, expiresAt? }`
   * @returns `201 { key: <full-api-key>, apiKey: <record without hash> }`
   */
  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/api-keys',
    async (request, reply) => {
      const parseResult = CreateApiKeySchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      const { name, environment, scopes, expiresAt } = parseResult.data;

      // Generate a random API key.
      const rawKey = `i18n_${crypto.randomBytes(32).toString('hex')}`;
      const keyPrefix = rawKey.substring(0, 5 + PREFIX_LENGTH); // 'i18n_' + 8 chars
      const keyHash = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);

      const record = await apiKeyRepo.create(app.db, {
        projectId: request.params.projectId,
        name,
        keyHash,
        keyPrefix,
        scopes,
        environment,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      // Return the full key ONLY on creation. Strip the hash from the response.
      const { keyHash: _hash, ...publicRecord } = record;

      return reply.status(201).send({
        key: rawKey,
        apiKey: publicRecord,
      });
    },
  );

  /**
   * GET /api/v1/projects/:projectId/api-keys
   *
   * Lists all API keys for the project. The key hash is stripped from the
   * response — only the prefix is visible.
   *
   * @returns `200 { apiKeys: ApiKey[] }`
   */
  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/api-keys',
    async (request, reply) => {
      const keys = await apiKeyRepo.findByProject(
        app.db,
        request.params.projectId,
      );

      // Strip key hashes from the response.
      const publicKeys = keys.map(({ keyHash, ...rest }) => rest);

      return reply.status(200).send({ apiKeys: publicKeys });
    },
  );

  /**
   * DELETE /api/v1/projects/:projectId/api-keys/:keyId
   *
   * Revokes (permanently deletes) an API key.
   *
   * @returns `204` (no body)
   */
  app.delete<{ Params: { projectId: string; keyId: string } }>(
    '/projects/:projectId/api-keys/:keyId',
    async (request, reply) => {
      const deleted = await apiKeyRepo.remove(app.db, request.params.keyId);

      if (!deleted) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'API key not found' },
        });
      }

      return reply.status(204).send();
    },
  );
}
