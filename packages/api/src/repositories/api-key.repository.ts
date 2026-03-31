/**
 * API key repository — data-access layer for the `api_keys` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * @module repositories/api-key.repository
 */

import { eq } from 'drizzle-orm';
import { apiKeys } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ────────────────────────────────────────────────────────────

/**
 * Payload required to insert a new API key record.
 * The raw key is never stored — only the bcrypt hash and a short prefix.
 */
export interface CreateApiKeyPayload {
  /** UUID of the project this key grants access to. */
  projectId: string;
  /** Human-readable label for the key. */
  name: string;
  /** Bcrypt hash of the full API key. */
  keyHash: string;
  /** Short prefix shown in UI for identification (e.g. 'i18n_abc12'). */
  keyPrefix: string;
  /** JSON array of permission scopes granted to this key. */
  scopes: unknown;
  /** Target deployment environment. */
  environment: string;
  /** Optional ISO 8601 expiry datetime. */
  expiresAt?: Date;
}

// ── Functions ────────────────────────────────────────────────────────────────

/**
 * Inserts a new API key row and returns the created record.
 *
 * @param db - Drizzle ORM database instance.
 * @param payload - The data required to create the API key.
 * @returns The newly inserted API key row.
 *
 * @example
 * ```ts
 * const key = await create(db, { projectId, name: 'CI key', keyHash, keyPrefix, scopes, environment: 'production' });
 * ```
 */
export async function create(db: Database, payload: CreateApiKeyPayload) {
  const rows = await db
    .insert(apiKeys)
    .values({
      projectId: payload.projectId,
      name: payload.name,
      keyHash: payload.keyHash,
      keyPrefix: payload.keyPrefix,
      scopes: payload.scopes,
      environment: payload.environment,
      expiresAt: payload.expiresAt,
    })
    .returning();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}

/**
 * Lists all API keys belonging to a given project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project whose API keys should be listed.
 * @returns An array of API key rows (may be empty).
 *
 * @example
 * ```ts
 * const keys = await findByProject(db, projectId);
 * ```
 */
export async function findByProject(db: Database, projectId: string) {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.projectId, projectId));
}

/**
 * Finds an API key by its short prefix.
 *
 * Used during authentication to identify which key to compare a raw token
 * against (the prefix is extracted from the incoming token).
 *
 * @param db - Drizzle ORM database instance.
 * @param prefix - The key prefix to search for.
 * @returns The matching API key row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const key = await findByPrefix(db, 'i18n_abc12');
 * ```
 */
export async function findByPrefix(db: Database, prefix: string) {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyPrefix, prefix))
    .limit(1);
  return rows[0];
}

/**
 * Deletes an API key by its primary-key UUID.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the API key to delete.
 * @returns The deleted API key row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * await remove(db, keyId);
 * ```
 */
export async function remove(db: Database, id: string) {
  const rows = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, id))
    .returning();
  return rows[0];
}

/**
 * Updates the `last_used_at` timestamp for an API key.
 *
 * Called after a successful authentication to track key usage.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the API key.
 * @returns The updated API key row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * await updateLastUsed(db, keyId);
 * ```
 */
export async function updateLastUsed(db: Database, id: string) {
  const rows = await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning();
  return rows[0];
}
