import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { translationKeys } from './translation-keys';

/**
 * Translations store the locale-specific value for a given translation key.
 * Each (key_id, locale) pair is unique — one row per language per key.
 * The status field tracks the translation workflow state.
 */
export const translations = pgTable(
  'translations',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the parent translation key. Cascades on delete. */
    keyId: uuid('key_id')
      .notNull()
      .references(() => translationKeys.id, { onDelete: 'cascade' }),

    /** BCP-47 locale tag this translation is for, e.g. 'fr', 'de', 'zh-Hans' (max 35 chars). */
    locale: varchar('locale', { length: 35 }).notNull(),

    /** The translated string value in the target locale. */
    value: text('value').default('').notNull(),

    /**
     * Workflow status of this translation.
     * Common values: 'untranslated', 'draft', 'pending_review', 'approved', 'rejected'.
     */
    status: varchar('status', { length: 30 }).default('untranslated').notNull(),

    /** Email or identifier of the person or service that last set this value (max 255 chars). */
    translatedBy: varchar('translated_by', { length: 255 }).default('').notNull(),

    /** Timestamp when the translation was created. */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    /** Timestamp when the translation was last updated. */
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('translations_key_locale_idx').on(table.keyId, table.locale),
    index('translations_locale_idx').on(table.locale),
    index('translations_status_idx').on(table.status),
  ],
);

/** Inferred TypeScript type for a row in the translations table. */
export type Translation = typeof translations.$inferSelect;

/** Inferred TypeScript type for inserting a row into the translations table. */
export type NewTranslation = typeof translations.$inferInsert;
