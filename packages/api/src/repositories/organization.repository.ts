/**
 * Organization repository — data-access layer for the `organizations` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * @module repositories/organization.repository
 */

import { eq } from 'drizzle-orm';
import { organizations, orgMembers } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ─────────────────────────────────────────────────────────────

/**
 * Payload required to create a new organization record.
 */
export interface CreateOrganizationPayload {
  /** Human-readable display name. */
  name: string;
  /** URL-safe unique slug. */
  slug: string;
}

/**
 * Payload for partially updating an existing organization.
 */
export interface UpdateOrganizationPayload {
  /** New display name. */
  name?: string;
  /** New settings object. */
  settings?: Record<string, unknown>;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Inserts a new organization row and returns the created record.
 *
 * @param db - Drizzle ORM database instance.
 * @param payload - The data required to create the organization.
 * @returns The newly inserted organization row.
 * @throws When the slug is already taken (unique constraint violation).
 *
 * @example
 * ```ts
 * const org = await create(db, { name: 'Acme Corp', slug: 'acme' });
 * ```
 */
export async function create(db: Database, payload: CreateOrganizationPayload) {
  const rows = await db
    .insert(organizations)
    .values({ name: payload.name, slug: payload.slug })
    .returning();

  // rows[0] is guaranteed — INSERT … RETURNING always returns the new row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}

/**
 * Finds an organization by its primary-key UUID.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the organization to retrieve.
 * @returns The matching organization row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const org = await findById(db, '550e8400-e29b-41d4-a716-446655440000');
 * ```
 */
export async function findById(db: Database, id: string) {
  const rows = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return rows[0];
}

/**
 * Finds an organization by its unique slug.
 *
 * @param db - Drizzle ORM database instance.
 * @param slug - The URL-safe slug to look up.
 * @returns The matching organization row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const org = await findBySlug(db, 'acme');
 * ```
 */
export async function findBySlug(db: Database, slug: string) {
  const rows = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return rows[0];
}

/**
 * Lists all organizations that the given user belongs to.
 *
 * Joins `org_members` → `organizations` so only orgs the user has a membership
 * row in are returned.
 *
 * @param db - Drizzle ORM database instance.
 * @param userId - The UUID of the user whose organizations should be listed.
 * @returns An array of organization rows (may be empty).
 *
 * @example
 * ```ts
 * const orgs = await findByUserId(db, userId);
 * ```
 */
export async function findByUserId(db: Database, userId: string) {
  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      settings: organizations.settings,
      createdAt: organizations.createdAt,
      updatedAt: organizations.updatedAt,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(orgMembers.orgId, organizations.id))
    .where(eq(orgMembers.userId, userId));

  return rows;
}

/**
 * Applies a partial update to an organization row.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the organization to update.
 * @param data - Fields to update (only supplied fields are changed).
 * @returns The updated organization row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const updated = await update(db, orgId, { name: 'New Name' });
 * ```
 */
export async function update(db: Database, id: string, data: UpdateOrganizationPayload) {
  const rows = await db
    .update(organizations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(organizations.id, id))
    .returning();

  return rows[0];
}

/**
 * Deletes an organization by its primary-key UUID.
 *
 * All child records (members, projects, etc.) are removed via database
 * cascade constraints.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the organization to delete.
 * @returns The deleted organization row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * await remove(db, orgId);
 * ```
 */
export async function remove(db: Database, id: string) {
  const rows = await db.delete(organizations).where(eq(organizations.id, id)).returning();
  return rows[0];
}
