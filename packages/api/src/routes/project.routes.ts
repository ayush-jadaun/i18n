/**
 * Project, locale, and namespace management routes for the i18n-platform API.
 *
 * Mounts under `/api/v1` and exposes ten endpoints:
 *
 * - `POST   /orgs/:orgId/projects`                    — Create a project
 * - `GET    /orgs/:orgId/projects`                    — List org's projects
 * - `GET    /projects/:projectId`                     — Get project (with locales + namespaces)
 * - `PATCH  /projects/:projectId`                     — Update a project
 * - `DELETE /projects/:projectId`                     — Delete a project
 * - `POST   /projects/:projectId/locales`             — Add a locale
 * - `DELETE /projects/:projectId/locales/:localeId`   — Remove a locale
 * - `POST   /projects/:projectId/namespaces`          — Create a namespace
 * - `PATCH  /projects/:projectId/namespaces/:nsId`    — Update a namespace
 * - `DELETE /projects/:projectId/namespaces/:nsId`    — Delete a namespace
 *
 * All endpoints require a valid JWT access token (`Authorization: Bearer <token>`).
 * Request bodies are validated with Zod via `@i18n-platform/core` schemas.
 *
 * @module routes/project.routes
 */

import type { FastifyInstance } from 'fastify';
import { CreateProjectSchema, UpdateProjectSchema, LocaleSchema } from '@i18n-platform/core';
import { NotFoundError, ConflictError } from '@i18n-platform/core';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import * as projectService from '../services/project.service.js';

/** Inline schema for namespace creation/update. */
const CreateNamespaceSchema = z.object({
  /** Programmatic name used in SDK lookups. */
  name: z.string().min(1, 'Namespace name must not be empty'),
  /** Optional human-readable description. */
  description: z.string().optional(),
});

/** Inline schema for partial namespace update. */
const UpdateNamespaceSchema = CreateNamespaceSchema.extend({
  sortOrder: z.number().int().min(0).optional(),
}).partial();

/**
 * Registers all project, locale, and namespace routes on the Fastify instance.
 *
 * This function is registered as an async Fastify plugin and is mounted in
 * `app.ts` using `app.register(projectRoutes, { prefix: '/api/v1' })`.
 *
 * @param app - The Fastify application instance (with `app.db` decorated).
 */
export async function projectRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication.
  app.addHook('preHandler', authenticate);

  // ── Project CRUD ────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/orgs/:orgId/projects
   *
   * Creates a new project inside the organization. Automatically seeds all
   * `supportedLocales` and creates a default "common" namespace.
   *
   * @requestBody `{ name, slug, defaultLocale, supportedLocales, delivery, settings? }`
   * @returns `201 { project }`
   */
  app.post<{ Params: { orgId: string } }>('/orgs/:orgId/projects', async (request, reply) => {
    const parseResult = CreateProjectSchema.safeParse(request.body);

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
      const project = await projectService.createProject(
        app.db,
        request.params.orgId,
        parseResult.data,
      );
      return reply.status(201).send({ project });
    } catch (err) {
      if (err instanceof ConflictError) {
        return reply.status(409).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  /**
   * GET /api/v1/orgs/:orgId/projects
   *
   * Lists all projects in the organization.
   *
   * @returns `200 { projects: Project[] }`
   */
  app.get<{ Params: { orgId: string } }>('/orgs/:orgId/projects', async (request, reply) => {
    const projects = await projectService.listProjects(app.db, request.params.orgId);
    return reply.status(200).send({ projects });
  });

  /**
   * GET /api/v1/projects/:projectId
   *
   * Returns a single project enriched with its locales and namespaces.
   *
   * @returns `200 { project }`
   */
  app.get<{ Params: { projectId: string } }>('/projects/:projectId', async (request, reply) => {
    try {
      const project = await projectService.getProject(app.db, request.params.projectId);
      return reply.status(200).send({ project });
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  /**
   * PATCH /api/v1/projects/:projectId
   *
   * Partially updates a project's fields.
   *
   * @requestBody `{ name?, slug?, defaultLocale?, delivery?, settings? }`
   * @returns `200 { project }`
   */
  app.patch<{ Params: { projectId: string } }>('/projects/:projectId', async (request, reply) => {
    const parseResult = UpdateProjectSchema.safeParse(request.body);

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
      const project = await projectService.updateProject(
        app.db,
        request.params.projectId,
        parseResult.data,
      );
      return reply.status(200).send({ project });
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: { code: err.code, message: err.message } });
      }
      if (err instanceof ConflictError) {
        return reply.status(409).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  /**
   * DELETE /api/v1/projects/:projectId
   *
   * Deletes a project and all its child records.
   *
   * @returns `204` (no body)
   */
  app.delete<{ Params: { projectId: string } }>(
    '/projects/:projectId',
    async (request, reply) => {
      try {
        await projectService.deleteProject(app.db, request.params.projectId);
        return reply.status(204).send();
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  // ── Locale management ───────────────────────────────────────────────────────

  /**
   * POST /api/v1/projects/:projectId/locales
   *
   * Adds a locale to the project.
   *
   * @requestBody `{ locale }`
   * @returns `201 { locale }`
   */
  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/locales',
    async (request, reply) => {
      const parseResult = z.object({ locale: LocaleSchema }).safeParse(request.body);

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
        const locale = await projectService.addLocale(
          app.db,
          request.params.projectId,
          parseResult.data.locale,
        );
        return reply.status(201).send({ locale });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        if (err instanceof ConflictError) {
          return reply.status(409).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  /**
   * DELETE /api/v1/projects/:projectId/locales/:localeId
   *
   * Removes a locale from the project.
   *
   * @returns `204` (no body)
   */
  app.delete<{ Params: { projectId: string; localeId: string } }>(
    '/projects/:projectId/locales/:localeId',
    async (request, reply) => {
      try {
        await projectService.removeLocale(
          app.db,
          request.params.projectId,
          request.params.localeId,
        );
        return reply.status(204).send();
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  // ── Namespace management ────────────────────────────────────────────────────

  /**
   * POST /api/v1/projects/:projectId/namespaces
   *
   * Creates a new namespace inside the project.
   *
   * @requestBody `{ name, description? }`
   * @returns `201 { namespace }`
   */
  app.post<{ Params: { projectId: string } }>(
    '/projects/:projectId/namespaces',
    async (request, reply) => {
      const parseResult = CreateNamespaceSchema.safeParse(request.body);

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
        const namespace = await projectService.createNamespace(
          app.db,
          request.params.projectId,
          parseResult.data,
        );
        return reply.status(201).send({ namespace });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        if (err instanceof ConflictError) {
          return reply.status(409).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  /**
   * PATCH /api/v1/projects/:projectId/namespaces/:nsId
   *
   * Partially updates a namespace's fields.
   *
   * @requestBody `{ name?, description?, sortOrder? }`
   * @returns `200 { namespace }`
   */
  app.patch<{ Params: { projectId: string; nsId: string } }>(
    '/projects/:projectId/namespaces/:nsId',
    async (request, reply) => {
      const parseResult = UpdateNamespaceSchema.safeParse(request.body);

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
        const namespace = await projectService.updateNamespace(
          app.db,
          request.params.nsId,
          parseResult.data,
        );
        return reply.status(200).send({ namespace });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  /**
   * DELETE /api/v1/projects/:projectId/namespaces/:nsId
   *
   * Deletes a namespace and all its child translation keys.
   *
   * @returns `204` (no body)
   */
  app.delete<{ Params: { projectId: string; nsId: string } }>(
    '/projects/:projectId/namespaces/:nsId',
    async (request, reply) => {
      try {
        await projectService.deleteNamespace(app.db, request.params.nsId);
        return reply.status(204).send();
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );
}
