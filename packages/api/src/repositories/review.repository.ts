/**
 * Review repository — data-access layer for the `translationReviews` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * @module repositories/review.repository
 */

import { eq } from 'drizzle-orm';
import { translationReviews } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ─────────────────────────────────────────────────────────────

/**
 * Payload required to insert a new translation review record.
 */
export interface CreateReviewPayload {
  /** UUID of the translation being reviewed. */
  translationId: string;
  /** UUID of the user submitting the review. */
  reviewerId: string;
  /** The review action — typically 'approve' or 'reject'. */
  action: string;
  /** Optional prose comment left by the reviewer. */
  comment?: string;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Inserts a new review row and returns the created record.
 *
 * @param db - Drizzle ORM database instance.
 * @param payload - The review data to insert.
 * @returns The newly inserted review row.
 *
 * @example
 * ```ts
 * const review = await create(db, {
 *   translationId: 'uuid',
 *   reviewerId: 'user-uuid',
 *   action: 'approve',
 *   comment: 'LGTM',
 * });
 * ```
 */
export async function create(db: Database, payload: CreateReviewPayload) {
  const rows = await db
    .insert(translationReviews)
    .values({
      translationId: payload.translationId,
      reviewerId: payload.reviewerId,
      action: payload.action,
      comment: payload.comment ?? '',
    })
    .returning();

  // rows[0] is guaranteed — INSERT … RETURNING always returns the new row.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}

/**
 * Lists all review records for a given translation, ordered by insertion
 * (most-recent last from the database's natural append order).
 *
 * @param db - Drizzle ORM database instance.
 * @param translationId - UUID of the translation whose reviews to list.
 * @returns An array of review rows (may be empty).
 *
 * @example
 * ```ts
 * const reviews = await findByTranslation(db, translationId);
 * ```
 */
export async function findByTranslation(db: Database, translationId: string) {
  const rows = await db
    .select()
    .from(translationReviews)
    .where(eq(translationReviews.translationId, translationId));

  return rows;
}
