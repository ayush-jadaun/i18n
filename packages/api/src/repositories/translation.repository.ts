/**
 * Translation repository — data-access layer for the `translations` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * @module repositories/translation.repository
 */

import { eq, and, sql } from 'drizzle-orm';
import { translations, translationKeys } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ─────────────────────────────────────────────────────────────

/**
 * Payload for inserting or updating a single translation row.
 */
export interface UpsertTranslationPayload {
  /** UUID of the parent translation key. */
  keyId: string;
  /** BCP-47 locale tag this translation is for. */
  locale: string;
  /** The translated string value. */
  value: string;
  /** Workflow lifecycle status (e.g. 'draft', 'approved'). */
  status?: string;
  /** Identifier of the user or service that provided this translation. */
  translatedBy?: string;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Finds a single translation by its key UUID and locale.
 *
 * @param db - Drizzle ORM database instance.
 * @param keyId - UUID of the parent translation key.
 * @param locale - BCP-47 locale tag.
 * @returns The matching translation row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const t = await findByKeyAndLocale(db, keyId, 'fr');
 * ```
 */
export async function findByKeyAndLocale(db: Database, keyId: string, locale: string) {
  const rows = await db
    .select()
    .from(translations)
    .where(and(eq(translations.keyId, keyId), eq(translations.locale, locale)))
    .limit(1);

  return rows[0];
}

/**
 * Returns all translations for a given project and locale by joining
 * `translations` with `translationKeys`.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @param locale - BCP-47 locale tag.
 * @returns An array of objects containing the key string and translation fields.
 *
 * @example
 * ```ts
 * const rows = await findByProjectAndLocale(db, projectId, 'fr');
 * ```
 */
export async function findByProjectAndLocale(
  db: Database,
  projectId: string,
  locale: string,
) {
  const rows = await db
    .select({
      translationId: translations.id,
      keyId: translations.keyId,
      key: translationKeys.key,
      locale: translations.locale,
      value: translations.value,
      status: translations.status,
      translatedBy: translations.translatedBy,
      createdAt: translations.createdAt,
      updatedAt: translations.updatedAt,
    })
    .from(translations)
    .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
    .where(
      and(
        eq(translationKeys.projectId, projectId),
        eq(translations.locale, locale),
      ),
    );

  return rows;
}

/**
 * Inserts or updates a single translation row (upsert on `(keyId, locale)`).
 *
 * If a row already exists for the given `(keyId, locale)` pair the `value`,
 * `status`, `translatedBy`, and `updatedAt` fields are updated in place.
 *
 * @param db - Drizzle ORM database instance.
 * @param payload - The translation data to insert or update.
 * @returns The inserted or updated translation row.
 *
 * @example
 * ```ts
 * const t = await upsert(db, { keyId, locale: 'fr', value: 'Bonjour', status: 'draft' });
 * ```
 */
export async function upsert(db: Database, payload: UpsertTranslationPayload) {
  const rows = await db
    .insert(translations)
    .values({
      keyId: payload.keyId,
      locale: payload.locale,
      value: payload.value,
      status: payload.status ?? 'draft',
      translatedBy: payload.translatedBy ?? '',
    })
    .onConflictDoUpdate({
      target: [translations.keyId, translations.locale],
      set: {
        value: payload.value,
        status: payload.status ?? 'draft',
        translatedBy: payload.translatedBy ?? '',
        updatedAt: new Date(),
      },
    })
    .returning();

  // rows[0] is guaranteed — INSERT … RETURNING always returns the row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}

/**
 * Bulk-upserts an array of translations using the same `(keyId, locale)` conflict
 * target as the single-row {@link upsert}.
 *
 * For the bulk case we reference Postgres `excluded.*` pseudo-columns via raw
 * SQL so that each row's own values are used in the update — this is the
 * idiomatic Drizzle pattern for multi-row upserts.
 *
 * @param db - Drizzle ORM database instance.
 * @param items - Array of translation upsert payloads.
 * @returns Array of inserted or updated translation rows.
 *
 * @example
 * ```ts
 * const updated = await bulkUpsert(db, [
 *   { keyId: 'uuid-1', locale: 'fr', value: 'Bonjour' },
 *   { keyId: 'uuid-2', locale: 'fr', value: 'Au revoir' },
 * ]);
 * ```
 */
export async function bulkUpsert(db: Database, items: UpsertTranslationPayload[]) {
  if (items.length === 0) return [];

  const rows = await db
    .insert(translations)
    .values(
      items.map((item) => ({
        keyId: item.keyId,
        locale: item.locale,
        value: item.value,
        status: item.status ?? 'draft',
        translatedBy: item.translatedBy ?? '',
      })),
    )
    .onConflictDoUpdate({
      target: [translations.keyId, translations.locale],
      set: {
        value: sql`excluded.value`,
        status: sql`excluded.status`,
        translatedBy: sql`excluded.translated_by`,
        updatedAt: new Date(),
      },
    })
    .returning();

  return rows;
}

/**
 * Updates only the status field of an existing translation row.
 *
 * @param db - Drizzle ORM database instance.
 * @param id - UUID of the translation to update.
 * @param status - The new lifecycle status value.
 * @returns The updated translation row, or `undefined` if not found.
 *
 * @example
 * ```ts
 * const t = await updateStatus(db, translationId, 'approved');
 * ```
 */
export async function updateStatus(db: Database, id: string, status: string) {
  const rows = await db
    .update(translations)
    .set({ status, updatedAt: new Date() })
    .where(eq(translations.id, id))
    .returning();

  return rows[0];
}
