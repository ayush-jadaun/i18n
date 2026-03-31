/**
 * Project repository — data-access layer for the `projects` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * @module repositories/project.repository
 */

import { eq, and } from 'drizzle-orm';
import { projects } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ─────────────────────────────────────────────────────────────

/**
 * Payload required to create a new project record.
 */
export interface CreateProjectPayload {
  /** UUID of the owning organization. */
  orgId: string;
  /** Human-readable display name. */
  name: string;
  /** URL-safe slug unique within the organization. */
  slug: string;
  /** BCP-47 tag for the project's source locale. */
  defaultLocale: string;
  /** Delivery mode ('cdn', 'api', 'bundled', etc.). */
  deliveryMode: string;
  /** Optional project settings object. */
  settings?: Record<string, unknown>;
}

/**
 * Payload for partially updating an existing project.
 */
export interface UpdateProjectPayload {
  /** New display name. */
  name?: string;
  /** New URL-safe slug. */
  slug?: string;
  /** New default locale BCP-47 tag. */
  defaultLocale?: string;
  /** New delivery mode. */
  deliveryMode?: string;
  /** New settings object. */
  settings?: Record<string, unknown>;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Inserts a new project row and returns the created record.
 *
 * @param db - Drizzle ORM database instance.
 * @param payload - The data required to create the project.
 * @returns The newly inserted project row.
 * @throws When the (orgId, slug) combination is already taken (unique constraint).
 *
 * @example
 * ```ts
 * const project = await create(db, {
 *   orgId: 'org-uuid',
 *   name: 'Web App',
 *   slug: 'web-app',
 *   defaultLocale: 'en',
 *   deliveryMode: 'cdn',
 * });
 * ```
 */
export async function create(db: Database, payload: CreateProjectPayload) {
  const rows = await db
    .insert(projects)
    .values({
      orgId: payload.orgId,
      name: payload.name,
      slug: payload.slug,
      defaultLocale: payload.defaultLocale,
      deliveryMode: payload.deliveryMode,
      settings: payload.settings,
    })
    .returning();

  // rows[0] is guaranteed — INSERT … RETURNING always returns the new row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}

/**
 * Finds a project by its primary-key UUID.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the project to retrieve.
 * @returns The matching project row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const project = await findById(db, 'project-uuid');
 * ```
 */
export async function findById(db: Database, id: string) {
  const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return rows[0];
}

/**
 * Lists all projects belonging to a given organization.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization whose projects should be listed.
 * @returns An array of project rows (may be empty).
 *
 * @example
 * ```ts
 * const projectList = await findByOrgId(db, orgId);
 * ```
 */
export async function findByOrgId(db: Database, orgId: string) {
  const rows = await db.select().from(projects).where(eq(projects.orgId, orgId));
  return rows;
}

/**
 * Finds a project by its organization UUID and slug combination.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization.
 * @param slug - The URL-safe slug of the project.
 * @returns The matching project row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const project = await findByOrgAndSlug(db, orgId, 'web-app');
 * ```
 */
export async function findByOrgAndSlug(db: Database, orgId: string, slug: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.orgId, orgId), eq(projects.slug, slug)))
    .limit(1);
  return rows[0];
}

/**
 * Applies a partial update to a project row.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the project to update.
 * @param data - Fields to update (only supplied fields are changed).
 * @returns The updated project row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const updated = await update(db, projectId, { name: 'New Name' });
 * ```
 */
export async function update(db: Database, id: string, data: UpdateProjectPayload) {
  const rows = await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();

  return rows[0];
}

/**
 * Deletes a project by its primary-key UUID.
 *
 * All child records (locales, namespaces, keys, etc.) are removed via database
 * cascade constraints.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the project to delete.
 * @returns The deleted project row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * await remove(db, projectId);
 * ```
 */
export async function remove(db: Database, id: string) {
  const rows = await db.delete(projects).where(eq(projects.id, id)).returning();
  return rows[0];
}
