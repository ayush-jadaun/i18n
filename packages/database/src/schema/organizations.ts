import { pgTable, uuid, varchar, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Organizations are the top-level tenant unit.
 * Every project, member, and resource belongs to an organization.
 */
export const organizations = pgTable(
  'organizations',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Human-readable display name for the organization (max 200 chars). */
    name: varchar('name', { length: 200 }).notNull(),

    /** URL-safe unique identifier used in routes and API paths (max 100 chars). */
    slug: varchar('slug', { length: 100 }).notNull(),

    /** Arbitrary JSON settings bag for organization-level configuration. */
    settings: jsonb('settings').default({}),

    /** Timestamp when the organization was created. */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    /** Timestamp when the organization was last updated. */
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('organizations_slug_idx').on(table.slug)],
);

/** Inferred TypeScript type for a row in the organizations table. */
export type Organization = typeof organizations.$inferSelect;

/** Inferred TypeScript type for inserting a row into the organizations table. */
export type NewOrganization = typeof organizations.$inferInsert;
