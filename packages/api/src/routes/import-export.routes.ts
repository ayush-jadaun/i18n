/**
 * Import/export routes for the i18n-platform API.
 *
 * Mounts under `/api/v1` and exposes two endpoints:
 *
 * - `POST /projects/:projectId/import` — Import a translation file
 * - `GET  /projects/:projectId/export` — Export translations in a given format
 *
 * All endpoints require a valid JWT access token (`Authorization: Bearer <token>`).
 * Request bodies and query strings are validated with Zod schemas from
 * `@i18n-platform/core`.
 *
 * @module routes/import-export.routes
 */

import type { FastifyInstance } from 'fastify';
import { ImportFileSchema, ExportQuerySchema } from '@i18n-platform/core';
import { authenticate } from '../middleware/auth.js';
import * as importExportService from '../services/import-export.service.js';

/**
 * Registers import and export routes on the Fastify instance.
 *
 * This function is registered as an async Fastify plugin and is mounted in
 * `app.ts` using `app.register(importExportRoutes, { prefix: '/api/v1' })`.
 *
 * @param app - The Fastify application instance (with `app.db` decorated).
 */
export async function importExportRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication.
  app.addHook('preHandler', authenticate);

  // ── Import ───────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/projects/:projectId/import
   *
   * Imports a translation file into the project. The file content, format,
   * locale, and conflict resolution strategy are specified in the request body.
   *
   * @requestBody `{ locale, format, content, namespace?, conflictStrategy }`
   * @returns `200 { created: number, updated: number, skipped: number }`
   */
  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/import',
    async (request, reply) => {
      const parseResult = ImportFileSchema.safeParse(request.body);

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
        const result = await importExportService.importTranslations(
          app.db,
          request.params.projectId,
          parseResult.data,
        );

        return reply.status(200).send(result);
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('Conflict:')) {
          return reply.status(409).send({
            error: { code: 'IMPORT_CONFLICT', message: err.message },
          });
        }
        throw err;
      }
    },
  );

  // ── Export ───────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/projects/:projectId/export
   *
   * Exports translations for the project in the requested format.
   * The locale, format, and optional filters are specified as query parameters.
   *
   * @querystring `{ locale, format, namespace?, statusFilter? }`
   * @returns `200 { content: string, fileExtension: string, entryCount: number }`
   */
  app.get<{
    Params: { projectId: string };
    Querystring: {
      locale?: string;
      format?: string;
      namespace?: string;
      statusFilter?: string;
    };
  }>('/projects/:projectId/export', async (request, reply) => {
    const raw = {
      locale: request.query.locale,
      format: request.query.format,
      namespace: request.query.namespace,
      statusFilter: request.query.statusFilter
        ? request.query.statusFilter.split(',')
        : undefined,
    };

    const parseResult = ExportQuerySchema.safeParse(raw);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parseResult.error.flatten().fieldErrors,
        },
      });
    }

    const { locale, format, namespace, statusFilter } = parseResult.data;

    if (!locale) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'locale query parameter is required',
        },
      });
    }

    const result = await importExportService.exportTranslations(
      app.db,
      request.params.projectId,
      { locale, format, namespace, statusFilter },
    );

    return reply.status(200).send(result);
  });
}
