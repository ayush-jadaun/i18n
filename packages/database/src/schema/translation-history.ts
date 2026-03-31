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
 * Translation history records every change made to a translation's value or status.
 * Used for audit trails, rollbacks, and contributor attribution.
 */
export const translationHistory = pgTable(
  'translation_history',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the translation that changed. Cascades on delete. */
    translationId: uuid('translation_id')
      .notNull()
      .references(() => translations.id, { onDelete: 'cascade' }),

    /** The translation value before the change was applied. */
    oldValue: text('old_value').default('').notNull(),

    /** The translation value after the change was applied. */
    newValue: text('new_value').default('').notNull(),

    /** The workflow status before the change (max 30 chars). */
    oldStatus: varchar('old_status', { length: 30 }).default('').notNull(),

    /** The workflow status after the change (max 30 chars). */
    newStatus: varchar('new_status', { length: 30 }).default('').notNull(),

    /** Foreign key referencing the user who made the change. Set to null if user is deleted. */
    changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),

    /**
     * Surface that triggered the change.
     * Common values: 'api', 'dashboard', 'cli', 'import', 'mt'.
     */
    changeSource: varchar('change_source', { length: 20 }).default('api').notNull(),

    /** Timestamp when this history record was created. */
    changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('translation_history_translation_id_idx').on(table.translationId),
    index('translation_history_changed_at_idx').on(table.changedAt),
  ],
);

/** Inferred TypeScript type for a row in the translation_history table. */
export type TranslationHistory = typeof translationHistory.$inferSelect;

/** Inferred TypeScript type for inserting a row into the translation_history table. */
export type NewTranslationHistory = typeof translationHistory.$inferInsert;
