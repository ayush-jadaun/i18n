import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

/** Default project settings applied when a project is created. */
const DEFAULT_PROJECT_SETTINGS = {
  autoTranslateOnPush: false,
  requireReview: true,
  minCoverageForPublish: 0,
};

/**
 * Projects are the primary resource within an organization.
 * Each project manages its own set of locales, namespaces, and translation keys.
 */
export const projects = pgTable(
  'projects',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the owning organization. Cascades on delete. */
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /** Human-readable display name of the project (max 200 chars). */
    name: varchar('name', { length: 200 }).notNull(),

    /** URL-safe slug unique within the organization (max 100 chars). */
    slug: varchar('slug', { length: 100 }).notNull(),

    /** BCP-47 tag for the project's source/default locale (max 35 chars). */
    defaultLocale: varchar('default_locale', { length: 35 }).notNull(),

    /**
     * How translated strings are delivered to consumers.
     * Common values: 'cdn', 'api', 'npm'.
     */
    deliveryMode: varchar('delivery_mode', { length: 20 }).default('cdn').notNull(),

    /** JSON configuration for translation workflow options. */
    settings: jsonb('settings').default(DEFAULT_PROJECT_SETTINGS),

    /** Timestamp when the project was created. */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    /** Timestamp when the project was last updated. */
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('projects_org_slug_idx').on(table.orgId, table.slug),
    index('projects_org_id_idx').on(table.orgId),
  ],
);

/** Inferred TypeScript type for a row in the projects table. */
export type Project = typeof projects.$inferSelect;

/** Inferred TypeScript type for inserting a row into the projects table. */
export type NewProject = typeof projects.$inferInsert;
