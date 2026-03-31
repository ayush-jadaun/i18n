import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { namespaces } from './namespaces';

/**
 * Translation keys represent the unique identifiers for each piece of translatable content.
 * Each key belongs to a project and optionally to a namespace, and carries metadata
 * such as a default value, description, and optional length constraint.
 */
export const translationKeys = pgTable(
  'translation_keys',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the parent project. Cascades on delete. */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    /** Foreign key referencing the optional namespace. Set to null on namespace delete. */
    namespaceId: uuid('namespace_id').references(() => namespaces.id, {
      onDelete: 'set null',
    }),

    /** The dot-notation or flat key string, e.g. 'common.button.save' (max 500 chars). */
    key: varchar('key', { length: 500 }).notNull(),

    /** Source-language default value used as fallback when no translation exists. */
    defaultValue: text('default_value').default('').notNull(),

    /** Human-readable description of what this key represents and how it is used. */
    description: text('description').default('').notNull(),

    /** Optional maximum character length constraint for translations of this key. */
    maxLength: integer('max_length'),

    /** Arbitrary JSON metadata bag for custom tooling or third-party integrations. */
    metadata: jsonb('metadata').default({}),

    /** When true the key is hidden from translators but not deleted. */
    isArchived: boolean('is_archived').default(false).notNull(),

    /** Timestamp when the key was created. */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    /** Timestamp when the key was last updated. */
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('translation_keys_project_key_idx').on(table.projectId, table.key),
    index('translation_keys_project_id_idx').on(table.projectId),
    index('translation_keys_namespace_id_idx').on(table.namespaceId),
  ],
);

/** Inferred TypeScript type for a row in the translation_keys table. */
export type TranslationKey = typeof translationKeys.$inferSelect;

/** Inferred TypeScript type for inserting a row into the translation_keys table. */
export type NewTranslationKey = typeof translationKeys.$inferInsert;
