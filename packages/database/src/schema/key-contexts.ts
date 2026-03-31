import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { translationKeys } from './translation-keys';

/**
 * Key contexts provide supplementary information to help translators understand
 * the usage of a translation key. Contexts may include screenshots, notes, or
 tml snippets attached to a key.
 */
export const keyContexts = pgTable(
  'key_contexts',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the parent translation key. Cascades on delete. */
    keyId: uuid('key_id')
      .notNull()
      .references(() => translationKeys.id, { onDelete: 'cascade' }),

    /**
     * The category of context being provided.
     * Common values: 'screenshot', 'note', 'html', 'url'.
     */
    type: varchar('type', { length: 20 }).notNull(),

    /** The raw context value — a URL, text note, or HTML snippet depending on type. */
    value: text('value').notNull(),

    /** Optional description clarifying what this context illustrates. */
    description: text('description').default('').notNull(),

    /** Timestamp when this context record was created. */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('key_contexts_key_id_idx').on(table.keyId),
  ],
);

/** Inferred TypeScript type for a row in the key_contexts table. */
export type KeyContext = typeof keyContexts.$inferSelect;

/** Inferred TypeScript type for inserting a row into the key_contexts table. */
export type NewKeyContext = typeof keyContexts.$inferInsert;
