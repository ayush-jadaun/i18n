/**
 * Translation key and translation management routes for the i18n-platform API.
 *
 * Mounts under `/api/v1` and exposes ten endpoints:
 *
 * - `POST   /projects/:projectId/keys`                              — Push/create keys (bulk)
 * - `GET    /projects/:projectId/keys`                              — List keys (paginated)
 * - `GET    /projects/:projectId/keys/:keyId`                       — Get key with translations
 * - `PATCH  /projects/:projectId/keys/:keyId`                       — Update key metadata
 * - `DELETE /projects/:projectId/keys/:keyId`                       — Delete key
 * - `GET    /projects/:projectId/translations/:locale`              — Get all translations for locale
 * - `PUT    /projects/:projectId/translations/:locale/:keyId`       — Set/update translation
 * - `PATCH  /projects/:projectId/translations/bulk`                 — Bulk update translations
 * - `POST   /projects/:projectId/translations/:locale/:keyId/review — Review (approve/reject)
 * - `POST   /projects/:projectId/translations/publish`              — Publish all approved
 *
 * All endpoints require a valid JWT access token (`Authorization: Bearer <token>`).
 * Request bodies are validated with Zod via `@i18n-platform/core` schemas.
 *
 * @module routes/translation.routes
 */

import type { FastifyInstance } from 'fastify';
import {
  CreateKeysSchema,
  UpdateTranslationSchema,
  BulkUpdateTranslationsSchema,
  ReviewTranslationSchema,
} from '@i18n-platform/core';
import { NotFoundError } from '@i18n-platform/core';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import * as translationService from '../services/translation.service.js';
import * as translationRepo from '../repositories/translation.repository.js';

/** Inline schema for updating key metadata. */
const UpdateKeySchema = z
  .object({
    /** New source/default value. */
    defaultValue: z.string().optional(),
    /** New human-readable description. */
    description: z.string().optional(),
    /** New namespace UUID to assign to this key. */
    namespaceId: z.string().uuid().optional(),
    /** New max character length constraint. */
    maxLength: z.number().positive().int().optional(),
    /** Whether to archive or unarchive this key. */
    isArchived: z.boolean().optional(),
  })
  .partial();

/**
 * Registers all translation key and translation management routes on the
 * Fastify instance.
 *
 * This function is registered as an async Fastify plugin and is mounted in
 * `app.ts` using `app.register(translationRoutes, { prefix: '/api/v1' })`.
 *
 * @param app - The Fastify application instance (with `app.db` decorated).
 */
export async function translationRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication.
  app.addHook('preHandler', authenticate);

  // ── Key CRUD ────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/projects/:projectId/keys
   *
   * Bulk-creates translation keys for the project. Keys that already exist are
   * silently skipped.
   *
   * @requestBody `{ keys: [{ key, defaultValue?, description?, namespace?, maxLength? }] }`
   * @returns `201 { created: TranslationKey[], skipped: number }`
   */
  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/keys',
    async (request, reply) => {
      const parseResult = CreateKeysSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      const { created, skipped } = await translationService.pushKeys(
        app.db,
        request.params.projectId,
        parseResult.data.keys,
      );

      return reply.status(201).send({ created, skipped });
    },
  );

  /**
   * GET /api/v1/projects/:projectId/keys
   *
   * Lists translation keys for the project with optional filters and pagination.
   *
   * @querystring `{ namespace?, search?, archived?, offset?, limit? }`
   * @returns `200 { keys: TranslationKey[], total: number }`
   */
  app.get<{
    Params: { projectId: string };
    Querystring: {
      namespace?: string;
      search?: string;
      archived?: string;
      offset?: string;
      limit?: string;
    };
  }>('/projects/:projectId/keys', async (request, reply) => {
    const { namespace, search, archived, offset, limit } = request.query;

    const { keys, total } = await translationService.getKeys(
      app.db,
      request.params.projectId,
      {
        namespace,
        search,
        archived: archived !== undefined ? archived === 'true' : undefined,
        offset: offset !== undefined ? parseInt(offset, 10) : 0,
        limit: limit !== undefined ? parseInt(limit, 10) : 20,
      },
    );

    return reply.status(200).send({ keys, total });
  });

  /**
   * GET /api/v1/projects/:projectId/keys/:keyId
   *
   * Returns a single translation key.
   *
   * @returns `200 { key }`
   */
  app.get<{ Params: { projectId: string; keyId: string } }>(
    '/projects/:projectId/keys/:keyId',
    async (request, reply) => {
      try {
        const key = await translationService.getKey(app.db, request.params.keyId);
        return reply.status(200).send({ key });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  /**
   * PATCH /api/v1/projects/:projectId/keys/:keyId
   *
   * Partially updates a translation key's metadata fields.
   *
   * @requestBody `{ defaultValue?, description?, namespaceId?, maxLength?, isArchived? }`
   * @returns `200 { key }`
   */
  app.patch<{ Params: { projectId: string; keyId: string } }>(
    '/projects/:projectId/keys/:keyId',
    async (request, reply) => {
      const parseResult = UpdateKeySchema.safeParse(request.body);

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
        const key = await translationService.updateKey(
          app.db,
          request.params.keyId,
          parseResult.data,
        );
        return reply.status(200).send({ key });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  /**
   * DELETE /api/v1/projects/:projectId/keys/:keyId
   *
   * Deletes a translation key and all its child translations.
   *
   * @returns `204` (no body)
   */
  app.delete<{ Params: { projectId: string; keyId: string } }>(
    '/projects/:projectId/keys/:keyId',
    async (request, reply) => {
      try {
        await translationService.deleteKey(app.db, request.params.keyId);
        return reply.status(204).send();
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  // ── Translations ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/projects/:projectId/translations/:locale
   *
   * Returns all translations for a project and locale as a flat key/value map.
   *
   * @returns `200 { translations: { [key]: value } }`
   */
  app.get<{ Params: { projectId: string; locale: string } }>(
    '/projects/:projectId/translations/:locale',
    async (request, reply) => {
      const map = await translationService.getTranslations(
        app.db,
        request.params.projectId,
        request.params.locale,
      );
      return reply.status(200).send({ translations: map });
    },
  );

  /**
   * PUT /api/v1/projects/:projectId/translations/:locale/:keyId
   *
   * Sets or updates a single translation for a key/locale pair.
   *
   * @requestBody `{ value, status? }`
   * @returns `200 { translation }`
   */
  app.put<{ Params: { projectId: string; locale: string; keyId: string } }>(
    '/projects/:projectId/translations/:locale/:keyId',
    async (request, reply) => {
      const parseResult = UpdateTranslationSchema.safeParse(request.body);

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
        const translation = await translationService.updateTranslation(
          app.db,
          request.params.keyId,
          request.params.locale,
          parseResult.data,
          request.user.id,
        );
        return reply.status(200).send({ translation });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  /**
   * PATCH /api/v1/projects/:projectId/translations/bulk
   *
   * Bulk-updates multiple translations in a single request.
   *
   * @requestBody `{ translations: [{ keyId, locale, value, status? }] }`
   * @returns `200 { updated: Translation[] }`
   */
  app.patch<{ Params: { projectId: string } }>(
    '/projects/:projectId/translations/bulk',
    async (request, reply) => {
      const parseResult = BulkUpdateTranslationsSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      const updated = await translationService.bulkUpdateTranslations(
        app.db,
        parseResult.data.translations,
        request.user.id,
      );

      return reply.status(200).send({ updated });
    },
  );

  /**
   * POST /api/v1/projects/:projectId/translations/:locale/:keyId/review
   *
   * Submits a review decision (approve or reject) for a specific translation.
   *
   * @requestBody `{ action: 'approved' | 'rejected', comment? }`
   * @returns `200 { review }`
   */
  app.post<{ Params: { projectId: string; locale: string; keyId: string } }>(
    '/projects/:projectId/translations/:locale/:keyId/review',
    async (request, reply) => {
      const parseResult = ReviewTranslationSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      // We need the translation row ID — look it up by keyId + locale.
      const { keyId, locale } = request.params;

      try {
        const existing = await translationRepo.findByKeyAndLocale(app.db, keyId, locale);

        if (!existing) {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Translation not found for this key and locale',
            },
          });
        }

        const review = await translationService.reviewTranslation(
          app.db,
          existing.id,
          parseResult.data,
          request.user.id,
        );
        return reply.status(200).send({ review });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  /**
   * POST /api/v1/projects/:projectId/translations/publish
   *
   * Marks all approved translations in the project as published.
   *
   * @returns `200 { published: number }`
   */
  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/translations/publish',
    async (request, reply) => {
      const published = await translationService.publishTranslations(
        app.db,
        request.params.projectId,
      );
      return reply.status(200).send({ published });
    },
  );
}
