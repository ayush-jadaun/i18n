import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

/** Default permissions applied to every new organization member. */
const DEFAULT_PERMISSIONS = {
  projects: {},
};

/**
 * Membership join table linking users to organizations with a role and fine-grained permissions.
 * The combination of (org_id, user_id) is unique — a user can only join an org once.
 */
export const orgMembers = pgTable(
  'org_members',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the parent organization. Cascades on delete. */
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /** Foreign key referencing the user. Cascades on delete. */
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    /**
     * Role of the member within the organization.
     * Common values: 'owner', 'admin', 'developer', 'translator', 'viewer'.
     */
    role: varchar('role', { length: 20 }).default('developer').notNull(),

    /** Fine-grained per-project permissions stored as a JSON object. */
    permissions: jsonb('permissions').default(DEFAULT_PERMISSIONS),

    /** Timestamp when the user joined the organization. */
    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('org_members_org_user_idx').on(table.orgId, table.userId)],
);

/** Inferred TypeScript type for a row in the org_members table. */
export type OrgMember = typeof orgMembers.$inferSelect;

/** Inferred TypeScript type for inserting a row into the org_members table. */
export type NewOrgMember = typeof orgMembers.$inferInsert;
