/**
 * Namespace repository — data-access layer for the `namespaces` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * @module repositories/namespace.repository
 */

import { eq } from 'drizzle-orm';
import { namespaces } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ─────────────────────────────────────────────────────────────

/**
 * Payload required to create a new namespace record.
 */
export interface CreateNamespacePayload {
  /** UUID of the parent project. */
  projectId: string;
  /** Programmatic name used in SDK lookups (e.g. 'common', 'auth'). */
  name: string;
  /** Optional human-readable description. */
  description?: string;
}

/**
 * Payload for partially updating an existing namespace.
 */
export interface UpdateNamespacePayload {
  /** New programmatic name. */
  name?: string;
  /** New description. */
  description?: string;
  /** New sort order (lower values appear first in the dashboard). */
  sortOrder?: number;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Inserts a new namespace row and returns the created record.
 *
 * @param db - Drizzle ORM database instance.
 * @param payload - The data required to create the namespace.
 * @returns The newly inserted namespace row.
 * @throws When the (projectId, name) combination already exists (unique constraint).
 *
 * @example
 * ```ts
 * const ns = await create(db, { projectId: 'project-uuid', name: 'common' });
 * ```
 */
export async function create(db: Database, payload: CreateNamespacePayload) {
  const rows = await db
    .insert(namespaces)
    .values({
      projectId: payload.projectId,
      name: payload.name,
      description: payload.description ?? '',
    })
    .returning();

  // rows[0] is guaranteed — INSERT … RETURNING always returns the new row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}

/**
 * Lists all namespaces associated with a given project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project whose namespaces should be listed.
 * @returns An array of namespace rows (may be empty).
 *
 * @example
 * ```ts
 * const nsList = await findByProject(db, projectId);
 * ```
 */
export async function findByProject(db: Database, projectId: string) {
  const rows = await db
    .select()
    .from(namespaces)
    .where(eq(namespaces.projectId, projectId));
  return rows;
}

/**
 * Finds a namespace by its primary-key UUID.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the namespace to retrieve.
 * @returns The matching namespace row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const ns = await findById(db, namespaceId);
 * ```
 */
export async function findById(db: Database, id: string) {
  const rows = await db.select().from(namespaces).where(eq(namespaces.id, id)).limit(1);
  return rows[0];
}

/**
 * Applies a partial update to a namespace row.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the namespace to update.
 * @param data - Fields to update (only supplied fields are changed).
 * @returns The updated namespace row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const updated = await update(db, namespaceId, { description: 'Shared strings' });
 * ```
 */
export async function update(db: Database, id: string, data: UpdateNamespacePayload) {
  const rows = await db
    .update(namespaces)
    .set(data)
    .where(eq(namespaces.id, id))
    .returning();

  return rows[0];
}

/**
 * Deletes a namespace by its primary-key UUID.
 *
 * All child records (translation keys, etc.) are removed via database
 * cascade constraints.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the namespace to delete.
 * @returns The deleted namespace row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * await remove(db, namespaceId);
 * ```
 */
export async function remove(db: Database, id: string) {
  const rows = await db.delete(namespaces).where(eq(namespaces.id, id)).returning();
  return rows[0];
}
