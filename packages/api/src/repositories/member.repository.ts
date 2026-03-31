/**
 * Member repository — data-access layer for the `org_members` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * @module repositories/member.repository
 */

import { eq, and } from 'drizzle-orm';
import { orgMembers, users } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ─────────────────────────────────────────────────────────────

/**
 * Payload required to add a new member to an organization.
 */
export interface AddMemberPayload {
  /** UUID of the organization. */
  orgId: string;
  /** UUID of the user being added. */
  userId: string;
  /** Role granted within the organization. */
  role: string;
  /** Optional fine-grained per-project permissions. */
  permissions?: Record<string, unknown>;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Inserts a new org_member row and returns the created record.
 *
 * @param db - Drizzle ORM database instance.
 * @param payload - Membership data to insert.
 * @returns The newly inserted org_member row.
 * @throws When the (orgId, userId) combination already exists (unique constraint).
 *
 * @example
 * ```ts
 * const membership = await addMember(db, {
 *   orgId: 'org-uuid',
 *   userId: 'user-uuid',
 *   role: 'developer',
 * });
 * ```
 */
export async function addMember(db: Database, payload: AddMemberPayload) {
  const rows = await db
    .insert(orgMembers)
    .values({
      orgId: payload.orgId,
      userId: payload.userId,
      role: payload.role,
      permissions: payload.permissions ?? { projects: {} },
    })
    .returning();

  // rows[0] is guaranteed — INSERT … RETURNING always returns the new row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}

/**
 * Lists all members of an organization with their name and email from the users table.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization whose members should be listed.
 * @returns An array of membership rows joined with user name and email.
 *
 * @example
 * ```ts
 * const members = await findMembers(db, orgId);
 * ```
 */
export async function findMembers(db: Database, orgId: string) {
  const rows = await db
    .select({
      id: orgMembers.id,
      orgId: orgMembers.orgId,
      userId: orgMembers.userId,
      role: orgMembers.role,
      permissions: orgMembers.permissions,
      joinedAt: orgMembers.joinedAt,
      name: users.name,
      email: users.email,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(orgMembers.orgId, orgId));

  return rows;
}

/**
 * Finds a specific membership record for a (org, user) pair.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization.
 * @param userId - UUID of the user.
 * @returns The matching org_member row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const membership = await findMembership(db, orgId, userId);
 * ```
 */
export async function findMembership(db: Database, orgId: string, userId: string) {
  const rows = await db
    .select()
    .from(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, userId)))
    .limit(1);

  return rows[0];
}

/**
 * Updates the role (and optionally permissions) of an existing membership.
 *
 * @param db - Drizzle ORM database instance.
 * @param memberId - UUID of the org_member row to update.
 * @param role - New role string to assign.
 * @param permissions - Optional updated permissions object.
 * @returns The updated org_member row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const updated = await updateRole(db, memberId, 'admin');
 * ```
 */
export async function updateRole(
  db: Database,
  memberId: string,
  role: string,
  permissions?: Record<string, unknown>,
) {
  const setData: Record<string, unknown> = { role };
  if (permissions !== undefined) {
    setData['permissions'] = permissions;
  }

  const rows = await db
    .update(orgMembers)
    .set(setData)
    .where(eq(orgMembers.id, memberId))
    .returning();

  return rows[0];
}

/**
 * Deletes a membership row by its primary-key UUID.
 *
 * @param db - Drizzle ORM database instance.
 * @param memberId - UUID of the org_member row to delete.
 * @returns The deleted org_member row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * await removeMember(db, memberId);
 * ```
 */
export async function removeMember(db: Database, memberId: string) {
  const rows = await db.delete(orgMembers).where(eq(orgMembers.id, memberId)).returning();
  return rows[0];
}
