/**
 * Translation key repository — data-access layer for the `translationKeys` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * @module repositories/key.repository
 */

import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { translationKeys } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ─────────────────────────────────────────────────────────────

/**
 * Payload required to create a single translation key record.
 */
export interface CreateKeyPayload {
  /** UUID of the parent project. */
  projectId: string;
  /** The dot-separated key identifier (e.g. 'auth.login.title'). */
  key: string;
  /** Source-language default value. */
  defaultValue?: string;
  /** Human-readable description for translators. */
  description?: string;
  /** Optional UUID of the namespace to assign this key to. */
  namespaceId?: string;
  /** Optional maximum character length constraint. */
  maxLength?: number;
}

/**
 * Payload for partially updating an existing translation key.
 */
export interface UpdateKeyPayload {
  /** New default value. */
  defaultValue?: string;
  /** New description. */
  description?: string;
  /** New namespace UUID. */
  namespaceId?: string;
  /** New max length constraint. */
  maxLength?: number;
  /** Whether to archive or unarchive this key. */
  isArchived?: boolean;
}

/**
 * Filter/pagination options for listing translation keys.
 */
export interface FindKeysOptions {
  /** Filter keys belonging to a specific namespace UUID. */
  namespace?: string;
  /** Case-insensitive substring search applied to key and defaultValue. */
  search?: string;
  /** When true returns only archived keys; when false returns only active keys. */
  archived?: boolean;
  /** Number of records to skip (0-based). */
  offset: number;
  /** Maximum number of records to return. */
  limit: number;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Bulk-inserts an array of translation key rows and returns all created records.
 *
 * Rows that already exist (violating the `(projectId, key)` unique constraint)
 * are silently skipped via `ON CONFLICT DO NOTHING`.
 *
 * @param db - Drizzle ORM database instance.
 * @param keys - Array of key creation payloads.
 * @returns The array of successfully inserted rows (may be shorter than input).
 *
 * @example
 * ```ts
 * const created = await createMany(db, [
 *   { projectId, key: 'auth.login.title', defaultValue: 'Log in' },
 * ]);
 * ```
 */
export async function createMany(db: Database, keys: CreateKeyPayload[]) {
  if (keys.length === 0) return [];

  const rows = await db
    .insert(translationKeys)
    .values(
      keys.map((k) => ({
        projectId: k.projectId,
        key: k.key,
        defaultValue: k.defaultValue ?? '',
        description: k.description ?? '',
        namespaceId: k.namespaceId ?? null,
        maxLength: k.maxLength ?? null,
      })),
    )
    .onConflictDoNothing()
    .returning();

  return rows;
}

/**
 * Lists translation keys for a project with optional filters and pagination.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project whose keys to list.
 * @param options - Pagination and filter options.
 * @returns A paginated array of translation key rows.
 *
 * @example
 * ```ts
 * const keys = await findByProject(db, projectId, { offset: 0, limit: 20, search: 'login' });
 * ```
 */
export async function findByProject(
  db: Database,
  projectId: string,
  options: FindKeysOptions,
) {
  const conditions = [eq(translationKeys.projectId, projectId)];

  if (options.namespace !== undefined) {
    conditions.push(eq(translationKeys.namespaceId, options.namespace));
  }

  if (options.archived !== undefined) {
    conditions.push(eq(translationKeys.isArchived, options.archived));
  }

  if (options.search) {
    const pattern = `%${options.search}%`;
    conditions.push(
      or(
        ilike(translationKeys.key, pattern),
        ilike(translationKeys.defaultValue, pattern),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(translationKeys)
    .where(and(...conditions))
    .limit(options.limit)
    .offset(options.offset);

  return rows;
}

/**
 * Finds a single translation key by its primary-key UUID.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the key to retrieve.
 * @returns The matching key row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const key = await findById(db, keyId);
 * ```
 */
export async function findById(db: Database, id: string) {
  const rows = await db
    .select()
    .from(translationKeys)
    .where(eq(translationKeys.id, id))
    .limit(1);
  return rows[0];
}

/**
 * Finds a translation key by its project and key string.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @param key - The dot-separated key string.
 * @returns The matching key row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const key = await findByProjectAndKey(db, projectId, 'auth.login.title');
 * ```
 */
export async function findByProjectAndKey(db: Database, projectId: string, key: string) {
  const rows = await db
    .select()
    .from(translationKeys)
    .where(and(eq(translationKeys.projectId, projectId), eq(translationKeys.key, key)))
    .limit(1);
  return rows[0];
}

/**
 * Applies a partial update to a translation key row.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the key to update.
 * @param data - Fields to update (only supplied fields are changed).
 * @returns The updated key row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const updated = await update(db, keyId, { description: 'Title shown on the login page' });
 * ```
 */
export async function update(db: Database, id: string, data: UpdateKeyPayload) {
  const rows = await db
    .update(translationKeys)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(translationKeys.id, id))
    .returning();

  return rows[0];
}

/**
 * Deletes a translation key by its primary-key UUID.
 *
 * All child translations are removed via database cascade constraints.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the key to delete.
 * @returns The deleted key row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * await remove(db, keyId);
 * ```
 */
export async function remove(db: Database, id: string) {
  const rows = await db
    .delete(translationKeys)
    .where(eq(translationKeys.id, id))
    .returning();
  return rows[0];
}

/**
 * Counts the total number of translation keys belonging to a project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @returns The total count as a number.
 *
 * @example
 * ```ts
 * const total = await countByProject(db, projectId);
 * ```
 */
export async function countByProject(db: Database, projectId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(translationKeys)
    .where(eq(translationKeys.projectId, projectId));

  return result[0]?.count ?? 0;
}
