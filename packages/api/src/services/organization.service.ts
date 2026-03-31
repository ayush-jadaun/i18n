/**
 * Organization service — business logic for organization CRUD and member management.
 *
 * All functions are stateless and accept a Drizzle `db` instance as the first
 * argument so they are easy to unit-test with mocks.
 *
 * Errors from `@i18n-platform/core` are thrown directly and mapped to HTTP
 * responses in the route layer.
 *
 * @module services/organization.service
 */

import type { Database } from '@i18n-platform/database';
import { NotFoundError, ConflictError } from '@i18n-platform/core';
import * as orgRepo from '../repositories/organization.repository.js';
import * as memberRepo from '../repositories/member.repository.js';
import * as userRepo from '../repositories/user.repository.js';

// ── Organizations ─────────────────────────────────────────────────────────────

/**
 * Creates a new organization and immediately adds the creator as an `owner`.
 *
 * @param db - Drizzle ORM database instance.
 * @param userId - UUID of the user creating the organization.
 * @param data - Organization name and slug.
 * @returns The newly created organization row.
 * @throws {@link ConflictError} when the slug is already taken.
 *
 * @example
 * ```ts
 * const org = await createOrg(db, userId, { name: 'Acme', slug: 'acme' });
 * ```
 */
export async function createOrg(
  db: Database,
  userId: string,
  data: { name: string; slug: string },
) {
  // Check for slug uniqueness before inserting to provide a friendly error.
  const existing = await orgRepo.findBySlug(db, data.slug);
  if (existing) {
    throw new ConflictError(`An organization with the slug "${data.slug}" already exists`);
  }

  const org = await orgRepo.create(db, data);

  // Add the creator as owner automatically.
  await memberRepo.addMember(db, {
    orgId: org.id,
    userId,
    role: 'owner',
  });

  return org;
}

/**
 * Returns a single organization by ID.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization.
 * @returns The matching organization row.
 * @throws {@link NotFoundError} when no organization with that ID exists.
 *
 * @example
 * ```ts
 * const org = await getOrg(db, orgId);
 * ```
 */
export async function getOrg(db: Database, orgId: string) {
  const org = await orgRepo.findById(db, orgId);

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  return org;
}

/**
 * Lists all organizations the given user is a member of.
 *
 * @param db - Drizzle ORM database instance.
 * @param userId - UUID of the user.
 * @returns Array of organization rows (may be empty).
 *
 * @example
 * ```ts
 * const orgs = await listUserOrgs(db, userId);
 * ```
 */
export async function listUserOrgs(db: Database, userId: string) {
  return orgRepo.findByUserId(db, userId);
}

/**
 * Applies a partial update to an organization.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization to update.
 * @param data - Fields to update.
 * @returns The updated organization row.
 * @throws {@link NotFoundError} when no organization with that ID exists.
 *
 * @example
 * ```ts
 * const updated = await updateOrg(db, orgId, { name: 'New Name' });
 * ```
 */
export async function updateOrg(
  db: Database,
  orgId: string,
  data: { name?: string; settings?: Record<string, unknown> },
) {
  // Ensure it exists first so we can throw the right error.
  await getOrg(db, orgId);

  const updated = await orgRepo.update(db, orgId, data);

  if (!updated) {
    throw new NotFoundError('Organization not found');
  }

  return updated;
}

/**
 * Deletes an organization and all its child records (via cascade).
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization to delete.
 * @throws {@link NotFoundError} when no organization with that ID exists.
 *
 * @example
 * ```ts
 * await deleteOrg(db, orgId);
 * ```
 */
export async function deleteOrg(db: Database, orgId: string) {
  await getOrg(db, orgId);
  await orgRepo.remove(db, orgId);
}

// ── Members ───────────────────────────────────────────────────────────────────

/**
 * Invites a user (looked up by email) to the given organization.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization.
 * @param payload - Invitation details: email and role.
 * @returns The new org_member row.
 * @throws {@link NotFoundError} when no user with that email exists.
 * @throws {@link ConflictError} when the user is already a member.
 *
 * @example
 * ```ts
 * const member = await inviteMember(db, orgId, {
 *   email: 'bob@example.com',
 *   role: 'developer',
 * });
 * ```
 */
export async function inviteMember(
  db: Database,
  orgId: string,
  payload: { email: string; role: string; permissions?: Record<string, unknown> },
) {
  const user = await userRepo.findByEmail(db, payload.email);

  if (!user) {
    throw new NotFoundError(`No user found with email "${payload.email}"`);
  }

  // Check for existing membership so we give a proper ConflictError.
  const existing = await memberRepo.findMembership(db, orgId, user.id);
  if (existing) {
    throw new ConflictError('User is already a member of this organization');
  }

  return memberRepo.addMember(db, {
    orgId,
    userId: user.id,
    role: payload.role,
    permissions: payload.permissions,
  });
}

/**
 * Lists all members of an organization with their user profile info.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization.
 * @returns Array of enriched membership rows (name, email included).
 *
 * @example
 * ```ts
 * const members = await listMembers(db, orgId);
 * ```
 */
export async function listMembers(db: Database, orgId: string) {
  return memberRepo.findMembers(db, orgId);
}

/**
 * Updates the role of an existing member.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization (used for scoping the lookup).
 * @param memberId - UUID of the org_member row to update.
 * @param data - New role (and optionally permissions) to apply.
 * @returns The updated org_member row.
 * @throws {@link NotFoundError} when no matching membership row exists.
 *
 * @example
 * ```ts
 * const updated = await updateMember(db, orgId, memberId, { role: 'admin' });
 * ```
 */
export async function updateMember(
  db: Database,
  orgId: string,
  memberId: string,
  data: { role: string; permissions?: Record<string, unknown> },
) {
  // Verify the member row actually belongs to this org.
  const members = await memberRepo.findMembers(db, orgId);
  const membership = members.find((m) => m.id === memberId);

  if (!membership) {
    throw new NotFoundError('Member not found in this organization');
  }

  const updated = await memberRepo.updateRole(db, memberId, data.role, data.permissions);

  if (!updated) {
    throw new NotFoundError('Member not found');
  }

  return updated;
}

/**
 * Removes a member from an organization.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization (used for scoping the lookup).
 * @param memberId - UUID of the org_member row to delete.
 * @throws {@link NotFoundError} when no matching membership row exists.
 *
 * @example
 * ```ts
 * await removeMember(db, orgId, memberId);
 * ```
 */
export async function removeMember(db: Database, orgId: string, memberId: string) {
  const members = await memberRepo.findMembers(db, orgId);
  const membership = members.find((m) => m.id === memberId);

  if (!membership) {
    throw new NotFoundError('Member not found in this organization');
  }

  await memberRepo.removeMember(db, memberId);
}
