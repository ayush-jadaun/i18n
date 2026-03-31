import {
  pgTable,
  uuid,
  varchar,
  real,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { mtConfigs } from './mt-configs';

/**
 * MT quality score snapshots measure the historical performance of a machine translation
 * provider over a rolling time window (window_start to window_end).
 * Aggregated acceptance metrics drive auto-approval threshold recommendations.
 */
export const mtQualityScores = pgTable(
  'mt_quality_scores',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the MT configuration this score belongs to. Cascades on delete. */
    mtConfigId: uuid('mt_config_id')
      .notNull()
      .references(() => mtConfigs.id, { onDelete: 'cascade' }),

    /** MT provider identifier duplicated here for query convenience (max 50 chars). */
    provider: varchar('provider', { length: 50 }).notNull(),

    /** Composite locale pair string, e.g. 'en→fr' (max 75 chars). */
    localePair: varchar('locale_pair', { length: 75 }).notNull(),

    /**
     * Computed quality score for this window (0–1 float).
     * Derived from the ratio of accepted-without-edit to total translations.
     */
    qualityScore: real('quality_score').default(0).notNull(),

    /** Total number of MT suggestions evaluated in this window. */
    totalTranslations: integer('total_translations').default(0).notNull(),

    /** Count of MT suggestions accepted by a reviewer without any edits. */
    acceptedWithoutEdit: integer('accepted_without_edit').default(0).notNull(),

    /** Count of MT suggestions accepted after the translator made corrections. */
    acceptedWithEdit: integer('accepted_with_edit').default(0).notNull(),

    /** Count of MT suggestions that were discarded and replaced with a manual translation. */
    rejected: integer('rejected').default(0).notNull(),

    /** Start of the measurement window (inclusive). */
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),

    /** End of the measurement window (exclusive). */
    windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('mt_quality_scores_mt_config_id_idx').on(table.mtConfigId),
    index('mt_quality_scores_locale_pair_idx').on(table.localePair),
  ],
);

/** Inferred TypeScript type for a row in the mt_quality_scores table. */
export type MtQualityScore = typeof mtQualityScores.$inferSelect;

/** Inferred TypeScript type for inserting a row into the mt_quality_scores table. */
export type NewMtQualityScore = typeof mtQualityScores.$inferInsert;
