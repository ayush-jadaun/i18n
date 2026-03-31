/**
 * Translation service — business logic for key CRUD, translation upsert,
 * review workflow, and publishing.
 *
 * All functions are stateless and accept a Drizzle `db` instance as the first
 * argument so they are easy to unit-test with mocks.
 *
 * Errors from `@i18n-platform/core` are thrown directly and mapped to HTTP
 * responses in the route layer.
 *
 * @module services/translation.service
 */

import type { Database } from '@i18n-platform/database';
import { translationHistory, translations, translationKeys } from '@i18n-platform/database';
import { NotFoundError } from '@i18n-platform/core';
import { eq, and } from 'drizzle-orm';
import * as keyRepo from '../repositories/key.repository.js';
import * as translationRepo from '../repositories/translation.repository.js';
import * as reviewRepo from '../repositories/review.repository.js';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A flat map of translation key strings to their translated values for a locale.
 * Used as the delivery format returned by {@link getTranslations}.
 */
export type TranslationMap = Record<string, string>;

// ── Keys ──────────────────────────────────────────────────────────────────────

/**
 * Bulk-creates translation keys for a project, skipping any that already exist.
 *
 * The uniqueness check is performed by the database `ON CONFLICT DO NOTHING`
 * constraint on `(projectId, key)`. Keys that were skipped are identified by
 * comparing the input list against the returned rows.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project to push keys into.
 * @param keys - Array of key definitions to create.
 * @returns An object with `created` (rows inserted) and `skipped` (count skipped).
 *
 * @example
 * ```ts
 * const result = await pushKeys(db, projectId, [
 *   { key: 'auth.login.title', defaultValue: 'Log in' },
 * ]);
 * console.log(result.created.length, result.skipped);
 * ```
 */
export async function pushKeys(
  db: Database,
  projectId: string,
  keys: Array<{
    key: string;
    defaultValue?: string;
    description?: string;
    namespace?: string;
    maxLength?: number;
  }>,
) {
  const payloads = keys.map((k) => ({
    projectId,
    key: k.key,
    defaultValue: k.defaultValue,
    description: k.description,
    // namespace here is the namespace name string — callers resolve to ID upstream
    // For the service layer we accept namespaceId directly in a separate shape.
    namespaceId: undefined as string | undefined,
    maxLength: k.maxLength,
  }));

  const created = await keyRepo.createMany(db, payloads);
  const skipped = keys.length - created.length;

  return { created, skipped };
}

/**
 * Returns a paginated list of translation keys for a project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @param filters - Pagination and optional filter options.
 * @returns Paginated list of key rows plus the total count.
 *
 * @example
 * ```ts
 * const { keys, total } = await getKeys(db, projectId, { offset: 0, limit: 20 });
 * ```
 */
export async function getKeys(
  db: Database,
  projectId: string,
  filters: {
    namespace?: string;
    search?: string;
    archived?: boolean;
    offset?: number;
    limit?: number;
  } = {},
) {
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 20;

  const [keys, total] = await Promise.all([
    keyRepo.findByProject(db, projectId, {
      namespace: filters.namespace,
      search: filters.search,
      archived: filters.archived,
      offset,
      limit,
    }),
    keyRepo.countByProject(db, projectId),
  ]);

  return { keys, total };
}

/**
 * Returns a single translation key by its UUID.
 *
 * @param db - Drizzle ORM database instance.
 * @param keyId - UUID of the translation key.
 * @returns The key row.
 * @throws {@link NotFoundError} when no key with that ID exists.
 *
 * @example
 * ```ts
 * const key = await getKey(db, keyId);
 * ```
 */
export async function getKey(db: Database, keyId: string) {
  const key = await keyRepo.findById(db, keyId);

  if (!key) {
    throw new NotFoundError('Translation key not found');
  }

  return key;
}

/**
 * Partially updates a translation key's metadata.
 *
 * @param db - Drizzle ORM database instance.
 * @param keyId - UUID of the key to update.
 * @param data - Fields to update.
 * @returns The updated key row.
 * @throws {@link NotFoundError} when no key with that ID exists.
 *
 * @example
 * ```ts
 * const updated = await updateKey(db, keyId, { description: 'New description' });
 * ```
 */
export async function updateKey(
  db: Database,
  keyId: string,
  data: {
    defaultValue?: string;
    description?: string;
    namespaceId?: string;
    maxLength?: number;
    isArchived?: boolean;
  },
) {
  const key = await keyRepo.findById(db, keyId);

  if (!key) {
    throw new NotFoundError('Translation key not found');
  }

  const updated = await keyRepo.update(db, keyId, data);

  if (!updated) {
    throw new NotFoundError('Translation key not found');
  }

  return updated;
}

/**
 * Deletes a translation key and all its child translations (via cascade).
 *
 * @param db - Drizzle ORM database instance.
 * @param keyId - UUID of the key to delete.
 * @throws {@link NotFoundError} when no key with that ID exists.
 *
 * @example
 * ```ts
 * await deleteKey(db, keyId);
 * ```
 */
export async function deleteKey(db: Database, keyId: string) {
  const key = await keyRepo.findById(db, keyId);

  if (!key) {
    throw new NotFoundError('Translation key not found');
  }

  await keyRepo.remove(db, keyId);
}

// ── Translations ──────────────────────────────────────────────────────────────

/**
 * Returns all translations for a project/locale combination as a flat
 * `{ [key]: value }` map suitable for client delivery.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @param locale - BCP-47 locale tag.
 * @returns A {@link TranslationMap} of key strings to translated values.
 *
 * @example
 * ```ts
 * const map = await getTranslations(db, projectId, 'fr');
 * // { 'auth.login.title': 'Connexion', ... }
 * ```
 */
export async function getTranslations(
  db: Database,
  projectId: string,
  locale: string,
): Promise<TranslationMap> {
  const rows = await translationRepo.findByProjectAndLocale(db, projectId, locale);

  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/**
 * Sets or updates a single translation and records a history entry.
 *
 * @param db - Drizzle ORM database instance.
 * @param keyId - UUID of the translation key.
 * @param locale - BCP-47 locale tag.
 * @param data - New value and optional status.
 * @param userId - UUID of the user performing the update.
 * @returns The upserted translation row.
 * @throws {@link NotFoundError} when no key with that ID exists.
 *
 * @example
 * ```ts
 * const t = await updateTranslation(db, keyId, 'fr', { value: 'Bonjour' }, userId);
 * ```
 */
export async function updateTranslation(
  db: Database,
  keyId: string,
  locale: string,
  data: { value: string; status?: string },
  userId: string,
) {
  const key = await keyRepo.findById(db, keyId);

  if (!key) {
    throw new NotFoundError('Translation key not found');
  }

  // Capture existing values for history before overwriting.
  const existing = await translationRepo.findByKeyAndLocale(db, keyId, locale);
  const oldValue = existing?.value ?? '';
  const oldStatus = existing?.status ?? 'untranslated';

  const translation = await translationRepo.upsert(db, {
    keyId,
    locale,
    value: data.value,
    status: data.status ?? 'draft',
    translatedBy: userId,
  });

  // Record history entry.
  await db.insert(translationHistory).values({
    translationId: translation.id,
    oldValue,
    newValue: data.value,
    oldStatus,
    newStatus: data.status ?? 'draft',
    changedBy: userId,
    changeSource: 'api',
  });

  return translation;
}

/**
 * Bulk-updates multiple translations and records a history entry for each.
 *
 * @param db - Drizzle ORM database instance.
 * @param items - Array of translation updates.
 * @param userId - UUID of the user performing the bulk update.
 * @returns Array of upserted translation rows.
 *
 * @example
 * ```ts
 * const updated = await bulkUpdateTranslations(db, [
 *   { keyId: 'uuid-1', locale: 'fr', value: 'Bonjour' },
 * ], userId);
 * ```
 */
export async function bulkUpdateTranslations(
  db: Database,
  items: Array<{ keyId: string; locale: string; value: string; status?: string }>,
  userId: string,
) {
  if (items.length === 0) return [];

  // Fetch existing translations for history recording.
  const existingMap = new Map<string, { value: string; status: string; id?: string }>();
  for (const item of items) {
    const existing = await translationRepo.findByKeyAndLocale(db, item.keyId, item.locale);
    if (existing) {
      existingMap.set(`${item.keyId}:${item.locale}`, {
        value: existing.value,
        status: existing.status,
        id: existing.id,
      });
    }
  }

  const updated = await translationRepo.bulkUpsert(
    db,
    items.map((item) => ({
      keyId: item.keyId,
      locale: item.locale,
      value: item.value,
      status: item.status ?? 'draft',
      translatedBy: userId,
    })),
  );

  // Record history entries for each updated translation.
  for (const row of updated) {
    const key = `${row.keyId}:${row.locale}`;
    const old = existingMap.get(key);
    await db.insert(translationHistory).values({
      translationId: row.id,
      oldValue: old?.value ?? '',
      newValue: row.value,
      oldStatus: old?.status ?? 'untranslated',
      newStatus: row.status,
      changedBy: userId,
      changeSource: 'api',
    });
  }

  return updated;
}

/**
 * Submits a review decision (approve/reject) for a translation.
 *
 * Creates a review record and updates the translation's status to match the
 * review action: `'approved'` action sets status to `'approved'`; `'rejected'`
 * sets it to `'needs_review'`.
 *
 * @param db - Drizzle ORM database instance.
 * @param translationId - UUID of the translation to review.
 * @param data - Review action and optional comment.
 * @param reviewerId - UUID of the reviewer user.
 * @returns The created review row.
 * @throws {@link NotFoundError} when no translation with that ID exists.
 *
 * @example
 * ```ts
 * const review = await reviewTranslation(db, translationId, { action: 'approved' }, userId);
 * ```
 */
export async function reviewTranslation(
  db: Database,
  translationId: string,
  data: { action: string; comment?: string },
  reviewerId: string,
) {
  // Verify the translation exists.
  const existing = await db
    .select()
    .from(translations)
    .where(eq(translations.id, translationId))
    .limit(1);

  if (!existing[0]) {
    throw new NotFoundError('Translation not found');
  }

  // Update status based on action.
  const newStatus = data.action === 'approved' ? 'approved' : 'needs_review';
  await translationRepo.updateStatus(db, translationId, newStatus);

  // Record the review.
  const review = await reviewRepo.create(db, {
    translationId,
    reviewerId,
    action: data.action,
    comment: data.comment,
  });

  return review;
}

/**
 * Marks all approved translations in a project as published.
 *
 * Finds every `translations` row linked to the project's keys that has
 * `status = 'approved'` and bulk-updates them to `status = 'published'`.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project to publish.
 * @returns The number of translations that were published.
 *
 * @example
 * ```ts
 * const count = await publishTranslations(db, projectId);
 * ```
 */
export async function publishTranslations(db: Database, projectId: string) {
  // Fetch all approved translations for this project via a join on translationKeys.
  const rows = await db
    .select({ id: translations.id })
    .from(translations)
    .innerJoin(
      translationKeys,
      and(
        eq(translations.keyId, translationKeys.id),
        eq(translationKeys.projectId, projectId),
      ),
    )
    .where(eq(translations.status, 'approved'));

  if (rows.length === 0) return 0;

  // Batch-update all approved translations to published.
  const ids = rows.map((r) => r.id);
  for (const id of ids) {
    await translationRepo.updateStatus(db, id, 'published');
  }

  return ids.length;
}
