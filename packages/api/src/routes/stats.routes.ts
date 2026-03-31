/**
 * Statistics and audit log routes for the i18n-platform API.
 *
 * Mounts under `/api/v1` and exposes three endpoints:
 *
 * - `GET /projects/:projectId/stats` — Project translation statistics
 * - `GET /orgs/:orgId/stats`         — Organization-wide statistics
 * - `GET /projects/:projectId/audit` — Paginated audit log
 *
 * All endpoints require a valid JWT access token (`Authorization: Bearer <token>`).
 *
 * @module routes/stats.routes
 */

import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import * as statsService from '../services/stats.service.js';
import * as auditRepo from '../repositories/audit.repository.js';

/**
 * Registers statistics and audit log routes on the Fastify instance.
 *
 * This function is registered as an async Fastify plugin and is mounted in
 * `app.ts` using `app.register(statsRoutes, { prefix: '/api/v1' })`.
 *
 * @param app - The Fastify application instance (with `app.db` decorated).
 */
export async function statsRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication.
  app.addHook('preHandler', authenticate);

  /**
   * GET /api/v1/projects/:projectId/stats
   *
   * Returns translation statistics for the project including total keys,
   * per-locale coverage, and status breakdown.
   *
   * @returns `200 { projectId, totalKeys, locales: [...] }`
   */
  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId/stats',
    async (request, reply) => {
      const stats = await statsService.getProjectStats(
        app.db,
        request.params.projectId,
      );
      return reply.status(200).send(stats);
    },
  );

  /**
   * GET /api/v1/orgs/:orgId/stats
   *
   * Returns aggregate translation statistics across all projects in the
   * organization.
   *
   * @returns `200 { orgId, totalProjects, totalKeys, projects: [...] }`
   */
  app.get<{ Params: { orgId: string } }>(
    '/orgs/:orgId/stats',
    async (request, reply) => {
      const stats = await statsService.getOrgStats(
        app.db,
        request.params.orgId,
      );
      return reply.status(200).send(stats);
    },
  );

  /**
   * GET /api/v1/projects/:projectId/audit
   *
   * Returns a paginated list of audit log entries for the project.
   *
   * @querystring `{ offset?, limit? }`
   * @returns `200 { entries: AuditLog[], total: number }`
   */
  app.get<{
    Params: { projectId: string };
    Querystring: { offset?: string; limit?: string };
  }>('/projects/:projectId/audit', async (request, reply) => {
    const offset = request.query.offset
      ? parseInt(request.query.offset, 10)
      : 0;
    const limit = request.query.limit
      ? parseInt(request.query.limit, 10)
      : 20;

    const result = await auditRepo.findByProject(
      app.db,
      request.params.projectId,
      { offset, limit },
    );

    return reply.status(200).send(result);
  });
}
