/**
 * Organization and member management routes for the i18n-platform API.
 *
 * Mounts under `/api/v1/orgs` and exposes nine endpoints:
 *
 * - `POST   /`                        — Create an organization
 * - `GET    /`                        — List user's organizations
 * - `GET    /:orgId`                  — Get a single organization
 * - `PATCH  /:orgId`                  — Update an organization
 * - `DELETE /:orgId`                  — Delete an organization
 * - `POST   /:orgId/members/invite`   — Invite a member by email
 * - `GET    /:orgId/members`          — List all members
 * - `PATCH  /:orgId/members/:memberId` — Update a member's role
 * - `DELETE /:orgId/members/:memberId` — Remove a member
 *
 * All endpoints require a valid JWT access token (`Authorization: Bearer <token>`).
 * Request bodies are validated with Zod via `@i18n-platform/core` schemas.
 *
 * @module routes/org.routes
 */

import type { FastifyInstance } from 'fastify';
import { CreateOrganizationSchema, UpdateOrganizationSchema, InviteMemberSchema } from '@i18n-platform/core';
import { NotFoundError, ConflictError } from '@i18n-platform/core';
import { authenticate } from '../middleware/auth.js';
import * as orgService from '../services/organization.service.js';

/**
 * Sends a standardized validation-error response.
 *
 * @param reply - The Fastify reply object.
 * @param details - Flattened Zod field errors.
 */
function sendValidationError(
  reply: ReturnType<FastifyInstance['inject']> extends Promise<infer R> ? never : Parameters<Parameters<FastifyInstance['post']>[1]>[1],
  details: Record<string, string[] | undefined>,
) {
  return reply.status(400).send({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details,
    },
  });
}

/**
 * Registers all `/api/v1/orgs/*` routes on the Fastify instance.
 *
 * This function is registered as an async Fastify plugin and is mounted in
 * `app.ts` using `app.register(orgRoutes, { prefix: '/api/v1/orgs' })`.
 *
 * @param app - The Fastify application instance (with `app.db` decorated).
 */
export async function orgRoutes(app: FastifyInstance): Promise<void> {
  // All routes in this plugin require authentication.
  app.addHook('preHandler', authenticate);

  // ── Organization CRUD ───────────────────────────────────────────────────────

  /**
   * POST /api/v1/orgs
   *
   * Creates a new organization. The authenticated user is automatically added
   * as the owner.
   *
   * @requestBody `{ name, slug }`
   * @returns `201 { organization }`
   */
  app.post('/', async (request, reply) => {
    const parseResult = CreateOrganizationSchema.safeParse(request.body);

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
      const org = await orgService.createOrg(app.db, request.user.id, parseResult.data);
      return reply.status(201).send({ organization: org });
    } catch (err) {
      if (err instanceof ConflictError) {
        return reply.status(409).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  /**
   * GET /api/v1/orgs
   *
   * Lists all organizations the authenticated user belongs to.
   *
   * @returns `200 { organizations: Organization[] }`
   */
  app.get('/', async (request, reply) => {
    const orgs = await orgService.listUserOrgs(app.db, request.user.id);
    return reply.status(200).send({ organizations: orgs });
  });

  /**
   * GET /api/v1/orgs/:orgId
   *
   * Returns a single organization by ID.
   *
   * @returns `200 { organization }`
   */
  app.get<{ Params: { orgId: string } }>('/:orgId', async (request, reply) => {
    try {
      const org = await orgService.getOrg(app.db, request.params.orgId);
      return reply.status(200).send({ organization: org });
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  /**
   * PATCH /api/v1/orgs/:orgId
   *
   * Partially updates an organization's name or settings.
   *
   * @requestBody `{ name?, settings? }`
   * @returns `200 { organization }`
   */
  app.patch<{ Params: { orgId: string } }>('/:orgId', async (request, reply) => {
    const parseResult = UpdateOrganizationSchema.safeParse(request.body);

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
      const org = await orgService.updateOrg(app.db, request.params.orgId, parseResult.data);
      return reply.status(200).send({ organization: org });
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  /**
   * DELETE /api/v1/orgs/:orgId
   *
   * Deletes an organization and all its child records.
   *
   * @returns `204` (no body)
   */
  app.delete<{ Params: { orgId: string } }>('/:orgId', async (request, reply) => {
    try {
      await orgService.deleteOrg(app.db, request.params.orgId);
      return reply.status(204).send();
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  // ── Member management ───────────────────────────────────────────────────────

  /**
   * POST /api/v1/orgs/:orgId/members/invite
   *
   * Invites a user (found by email) to the organization with the given role.
   *
   * @requestBody `{ email, role, permissions? }`
   * @returns `201 { member }`
   */
  app.post<{ Params: { orgId: string } }>('/:orgId/members/invite', async (request, reply) => {
    const parseResult = InviteMemberSchema.safeParse(request.body);

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
      const member = await orgService.inviteMember(app.db, request.params.orgId, parseResult.data);
      return reply.status(201).send({ member });
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
   * GET /api/v1/orgs/:orgId/members
   *
   * Lists all members of the organization with their name and email.
   *
   * @returns `200 { members: Member[] }`
   */
  app.get<{ Params: { orgId: string } }>('/:orgId/members', async (request, reply) => {
    try {
      const members = await orgService.listMembers(app.db, request.params.orgId);
      return reply.status(200).send({ members });
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.status(404).send({ error: { code: err.code, message: err.message } });
      }
      throw err;
    }
  });

  /**
   * PATCH /api/v1/orgs/:orgId/members/:memberId
   *
   * Updates the role (and optionally permissions) of an existing member.
   *
   * @requestBody `{ role }`
   * @returns `200 { member }`
   */
  app.patch<{ Params: { orgId: string; memberId: string } }>(
    '/:orgId/members/:memberId',
    async (request, reply) => {
      const parseResult = InviteMemberSchema.pick({ role: true }).safeParse(request.body);

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
        const member = await orgService.updateMember(
          app.db,
          request.params.orgId,
          request.params.memberId,
          parseResult.data,
        );
        return reply.status(200).send({ member });
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ error: { code: err.code, message: err.message } });
        }
        throw err;
      }
    },
  );

  /**
   * DELETE /api/v1/orgs/:orgId/members/:memberId
   *
   * Removes a member from the organization.
   *
   * @returns `204` (no body)
   */
  app.delete<{ Params: { orgId: string; memberId: string } }>(
    '/:orgId/members/:memberId',
    async (request, reply) => {
      try {
        await orgService.removeMember(app.db, request.params.orgId, request.params.memberId);
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
