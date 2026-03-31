/**
 * Locale repository — data-access layer for the `project_locales` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * @module repositories/locale.repository
 */

import { eq } from 'drizzle-orm';
import { projectLocales } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ─────────────────────────────────────────────────────────────

/**
 * Payload required to add a locale to a project.
 */
export interface AddLocalePayload {
  /** UUID of the project this locale belongs to. */
  projectId: string;
  /** BCP-47 locale tag (e.g. 'en', 'fr-CA'). */
  locale: string;
}

/**
 * Payload for partially updating an existing project locale.
 */
export interface UpdateLocalePayload {
  /** Whether this locale is actively served in the delivery pipeline. */
  enabled?: boolean;
  /** Translation coverage percentage (0–100). */
  coveragePercent?: number;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Inserts a new project_locale row and returns the created record.
 *
 * @param db - Drizzle ORM database instance.
 * @param payload - The project ID and locale tag to insert.
 * @returns The newly inserted project_locale row.
 * @throws When the (projectId, locale) combination already exists (unique constraint).
 *
 * @example
 * ```ts
 * const locale = await addLocale(db, { projectId: 'project-uuid', locale: 'fr' });
 * ```
 */
export async function addLocale(db: Database, payload: AddLocalePayload) {
  const rows = await db
    .insert(projectLocales)
    .values({
      projectId: payload.projectId,
      locale: payload.locale,
    })
    .returning();

  // rows[0] is guaranteed — INSERT … RETURNING always returns the new row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}

/**
 * Lists all locales associated with a given project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project whose locales should be listed.
 * @returns An array of project_locale rows (may be empty).
 *
 * @example
 * ```ts
 * const locales = await findByProject(db, projectId);
 * ```
 */
export async function findByProject(db: Database, projectId: string) {
  const rows = await db
    .select()
    .from(projectLocales)
    .where(eq(projectLocales.projectId, projectId));
  return rows;
}

/**
 * Applies a partial update to a project_locale row.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the project_locale row to update.
 * @param data - Fields to update (enabled, coveragePercent, etc.).
 * @returns The updated project_locale row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const updated = await update(db, localeId, { enabled: false });
 * ```
 */
export async function update(db: Database, id: string, data: UpdateLocalePayload) {
  const rows = await db
    .update(projectLocales)
    .set(data)
    .where(eq(projectLocales.id, id))
    .returning();

  return rows[0];
}

/**
 * Deletes a project_locale row by its primary-key UUID.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - The UUID of the project_locale row to delete.
 * @returns The deleted project_locale row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * await remove(db, localeId);
 * ```
 */
export async function remove(db: Database, id: string) {
  const rows = await db.delete(projectLocales).where(eq(projectLocales.id, id)).returning();
  return rows[0];
}
