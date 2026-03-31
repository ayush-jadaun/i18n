import {
  pgTable,
  uuid,
  varchar,
  boolean,
  real,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

/**
 * Project-locale join records — tracks which locales are enabled for a project
 * along with translation coverage statistics and sync metadata.
 */
export const projectLocales = pgTable(
  'project_locales',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the parent project. Cascades on delete. */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    /** BCP-47 locale tag, e.g. 'en', 'fr-CA', 'zh-Hans' (max 35 chars). */
    locale: varchar('locale', { length: 35 }).notNull(),

    /** Whether this locale is actively served in the delivery pipeline. */
    enabled: boolean('enabled').default(true).notNull(),

    /**
     * Percentage of translation keys that have an approved translation.
     * Stored as a real (float4) value between 0 and 100.
     */
    coveragePercent: real('coverage_percent').default(0).notNull(),

    /** Timestamp of the most recent sync with the delivery CDN / cache. Nullable. */
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('project_locales_project_locale_idx').on(table.projectId, table.locale),
  ],
);

/** Inferred TypeScript type for a row in the project_locales table. */
export type ProjectLocale = typeof projectLocales.$inferSelect;

/** Inferred TypeScript type for inserting a row into the project_locales table. */
export type NewProjectLocale = typeof projectLocales.$inferInsert;
