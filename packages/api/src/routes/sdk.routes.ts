/**
 * SDK delivery routes for the i18n-platform API.
 *
 * These are public endpoints authenticated via API key (not JWT). Clients
 * provide their API key either as a `Bearer` token in the `Authorization`
 * header or as an `apiKey` query parameter.
 *
 * Mounts under `/api/v1/sdk` and exposes two endpoints:
 *
 * - `GET /sdk/:projectId/:locale`              — All translations for a locale
 * - `GET /sdk/:projectId/:locale/:namespace`    — Translations for a namespace
 *
 * @module routes/sdk.routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import * as apiKeyRepo from '../repositories/api-key.repository.js';
import * as translationRepo from '../repositories/translation.repository.js';

/**
 * Authenticates a request using an API key.
 *
 * Extracts the raw key from the `Authorization: Bearer <key>` header or the
 * `apiKey` query parameter, looks up the corresponding record by prefix, and
 * verifies the key against the stored bcrypt hash.
 *
 * @param app - The Fastify instance providing the `db` decoration.
 * @param request - The incoming Fastify request.
 * @param reply - The Fastify reply object.
 * @returns The validated API key record, or `undefined` if authentication fails
 *          (in which case a 401 response has already been sent).
 */
async function authenticateApiKey(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Extract the raw key from header or query parameter.
  const authHeader = request.headers.authorization;
  const queryKey = (request.query as Record<string, string>).apiKey;

  let rawKey: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawKey = authHeader.slice(7);
  } else if (queryKey) {
    rawKey = queryKey;
  }

  if (!rawKey || !rawKey.startsWith('i18n_')) {
    await reply.status(401).send({
      error: { code: 'AUTHENTICATION_ERROR', message: 'API key required' },
    });
    return undefined;
  }

  // Extract prefix for lookup (first 13 chars: 'i18n_' + 8 hex chars).
  const prefix = rawKey.substring(0, 13);
  const keyRecord = await apiKeyRepo.findByPrefix(app.db, prefix);

  if (!keyRecord) {
    await reply.status(401).send({
      error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid API key' },
    });
    return undefined;
  }

  // Verify the raw key against the stored hash.
  const isValid = await bcrypt.compare(rawKey, keyRecord.keyHash);
  if (!isValid) {
    await reply.status(401).send({
      error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid API key' },
    });
    return undefined;
  }

  // Check expiry.
  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    await reply.status(401).send({
      error: { code: 'AUTHENTICATION_ERROR', message: 'API key has expired' },
    });
    return undefined;
  }

  // Update last used timestamp (fire and forget).
  apiKeyRepo.updateLastUsed(app.db, keyRecord.id).catch(() => {
    /* best-effort */
  });

  return keyRecord;
}

/**
 * Registers SDK delivery routes on the Fastify instance.
 *
 * This function is registered as an async Fastify plugin and is mounted in
 * `app.ts` using `app.register(sdkRoutes, { prefix: '/api/v1/sdk' })`.
 *
 * @param app - The Fastify application instance (with `app.db` decorated).
 */
export async function sdkRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/sdk/:projectId/:locale
   *
   * Returns all published or approved translations for a project and locale
   * as a flat key/value map. Intended for SDK / client consumption.
   *
   * @returns `200 { translations: { [key]: value } }`
   */
  app.get<{
    Params: { projectId: string; locale: string };
    Querystring: { apiKey?: string };
  }>('/:projectId/:locale', async (request, reply) => {
    const keyRecord = await authenticateApiKey(app, request, reply);
    if (!keyRecord) return;

    // Verify the key belongs to this project.
    if (keyRecord.projectId !== request.params.projectId) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'API key does not have access to this project',
        },
      });
    }

    const rows = await translationRepo.findByProjectAndLocale(
      app.db,
      request.params.projectId,
      request.params.locale,
    );

    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }

    return reply.status(200).send({ translations: map });
  });

  /**
   * GET /api/v1/sdk/:projectId/:locale/:namespace
   *
   * Returns translations for a specific namespace within a project and locale.
   * This is a convenience endpoint for clients that use namespaced key loading.
   *
   * Keys are returned without their namespace prefix for cleaner SDK usage.
   *
   * @returns `200 { translations: { [key]: value } }`
   */
  app.get<{
    Params: { projectId: string; locale: string; namespace: string };
    Querystring: { apiKey?: string };
  }>('/:projectId/:locale/:namespace', async (request, reply) => {
    const keyRecord = await authenticateApiKey(app, request, reply);
    if (!keyRecord) return;

    // Verify the key belongs to this project.
    if (keyRecord.projectId !== request.params.projectId) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'API key does not have access to this project',
        },
      });
    }

    const rows = await translationRepo.findByProjectAndLocale(
      app.db,
      request.params.projectId,
      request.params.locale,
    );

    // Filter by namespace prefix (keys use "namespace.rest.of.key" convention).
    const nsPrefix = `${request.params.namespace}.`;
    const map: Record<string, string> = {};
    for (const row of rows) {
      if (row.key.startsWith(nsPrefix)) {
        map[row.key] = row.value;
      }
    }

    return reply.status(200).send({ translations: map });
  });
}
