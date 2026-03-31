/**
 * Machine translation routes for the i18n-platform API.
 *
 * Mounts under `/api/v1` and exposes three endpoints:
 *
 * - `POST /projects/:projectId/mt/translate` — Trigger an MT job
 * - `GET  /projects/:projectId/mt/config`    — Get MT configuration
 * - `PUT  /projects/:projectId/mt/config`    — Update MT configuration
 *
 * All endpoints require a valid JWT access token (`Authorization: Bearer <token>`).
 *
 * @module routes/mt.routes
 */

import type { FastifyInstance } from 'fastify';
import { TriggerMtSchema } from '@i18n-platform/core';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import * as mtService from '../services/mt.service.js';

/** Inline schema for updating MT configuration. */
const UpdateMtConfigSchema = z.object({
  /** BCP-47 source locale. */
  sourceLocale: z.string().min(1),
  /** BCP-47 target locale. */
  targetLocale: z.string().min(1),
  /** MT provider identifier. */
  provider: z.string().min(1),
  /** Whether this configuration is enabled. */
  enabled: z.boolean().optional(),
  /** Whether to auto-translate new keys. */
  autoTranslate: z.boolean().optional(),
});

/**
 * Registers machine translation routes on the Fastify instance.
 *
 * This function is registered as an async Fastify plugin and is mounted in
 * `app.ts` using `app.register(mtRoutes, { prefix: '/api/v1' })`.
 *
 * @param app - The Fastify application instance (with `app.db` decorated).
 */
export async function mtRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication.
  app.addHook('preHandler', authenticate);

  /**
   * POST /api/v1/projects/:projectId/mt/translate
   *
   * Triggers a machine translation job for the specified locale.
   *
   * @requestBody `{ locale, provider?, keyIds? }`
   * @returns `200 { translatedCount: number, providerId: string }`
   */
  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/mt/translate',
    async (request, reply) => {
      const parseResult = TriggerMtSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      const result = await mtService.translateKeys(
        app.db,
        request.params.projectId,
        parseResult.data,
      );

      return reply.status(200).send(result);
    },
  );

  /**
   * GET /api/v1/projects/:projectId/mt/config
   *
   * Returns the MT configuration for the project.
   *
   * @returns `200 { configs: MtConfig[] }`
   */
  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/mt/config',
    async (request, reply) => {
      const configs = await mtService.getMtConfig(
        app.db,
        request.params.projectId,
      );
      return reply.status(200).send({ configs });
    },
  );

  /**
   * PUT /api/v1/projects/:projectId/mt/config
   *
   * Creates or updates an MT configuration for the project.
   *
   * @requestBody `{ sourceLocale, targetLocale, provider, enabled?, autoTranslate? }`
   * @returns `200 { config }`
   */
  app.put<{ Params: { projectId: string } }>(
    '/projects/:projectId/mt/config',
    async (request, reply) => {
      const parseResult = UpdateMtConfigSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten().fieldErrors,
          },
        });
      }

      const config = await mtService.updateMtConfig(
        app.db,
        request.params.projectId,
        parseResult.data,
      );

      return reply.status(200).send({ config });
    },
  );
}
