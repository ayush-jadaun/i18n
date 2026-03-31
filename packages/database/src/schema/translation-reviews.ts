import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { translations } from './translations';
import { users } from './users';

/**
 * Translation reviews record reviewer actions (approve, reject, comment) on translations.
 * Multiple reviews per translation are allowed to support review workflows and audit history.
 */
export const translationReviews = pgTable(
  'translation_reviews',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the translation being reviewed. Cascades on delete. */
    translationId: uuid('translation_id')
      .notNull()
      .references(() => translations.id, { onDelete: 'cascade' }),

    /** Foreign key referencing the user who performed the review. Cascades on delete. */
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /**
     * The review action taken.
     * Common values: 'approve', 'reject', 'comment', 'request_changes'.
     */
    action: varchar('action', { length: 20 }).notNull(),

    /** Optional prose comment left by the reviewer. */
    comment: text('comment').default('').notNull(),

    /** Timestamp when the review was submitted. */
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('translation_reviews_translation_id_idx').on(table.translationId),
    index('translation_reviews_reviewer_id_idx').on(table.reviewerId),
  ],
);

/** Inferred TypeScript type for a row in the translation_reviews table. */
export type TranslationReview = typeof translationReviews.$inferSelect;

/** Inferred TypeScript type for inserting a row into the translation_reviews table. */
export type NewTranslationReview = typeof translationReviews.$inferInsert;
