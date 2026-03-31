import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

/**
 * Namespaces group related translation keys within a project.
 * Common examples: 'common', 'auth', 'dashboard', 'errors'.
 */
export const namespaces = pgTable(
  'namespaces',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the parent project. Cascades on delete. */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    /** Programmatic name of the namespace used in SDK lookups (max 100 chars). */
    name: varchar('name', { length: 100 }).notNull(),

    /** Optional human-readable description of what this namespace contains. */
    description: text('description').default('').notNull(),

    /** Integer used to control display order in the dashboard. Lower values appear first. */
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    uniqueIndex('namespaces_project_name_idx').on(table.projectId, table.name),
  ],
);

/** Inferred TypeScript type for a row in the namespaces table. */
export type Namespace = typeof namespaces.$inferSelect;

/** Inferred TypeScript type for inserting a row into the namespaces table. */
export type NewNamespace = typeof namespaces.$inferInsert;
