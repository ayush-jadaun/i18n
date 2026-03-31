import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Audit log captures every significant action performed in the platform.
 * Records are immutable — rows are inserted, never updated or deleted.
 * Used for security compliance, change tracking, and support investigations.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the organization in which the action occurred. Cascades on delete. */
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /** Optional UUID of the project the action relates to. Null for org-level actions. */
    projectId: uuid('project_id'),

    /** Foreign key referencing the user who performed the action. Set to null if user is deleted. */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    /**
     * Identifier of the action performed, e.g. 'translation.approve', 'project.create' (max 100 chars).
     */
    action: varchar('action', { length: 100 }).notNull(),

    /** The type of resource the action was performed on, e.g. 'translation', 'project' (max 50 chars). */
    resourceType: varchar('resource_type', { length: 50 }).notNull(),

    /** UUID of the specific resource instance the action targeted. Nullable for list actions. */
    resourceId: uuid('resource_id'),

    /** JSON snapshot of the resource state before the change. Null for create actions. */
    oldValue: jsonb('old_value'),

    /** JSON snapshot of the resource state after the change. Null for delete actions. */
    newValue: jsonb('new_value'),

    /** IP address of the client that performed the action (IPv4 or IPv6, max 45 chars). */
    ipAddress: varchar('ip_address', { length: 45 }),

    /** Timestamp when the audit event was recorded. */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_log_org_id_idx').on(table.orgId),
    index('audit_log_project_id_idx').on(table.projectId),
    index('audit_log_user_id_idx').on(table.userId),
    index('audit_log_created_at_idx').on(table.createdAt),
    index('audit_log_action_idx').on(table.action),
  ],
);

/** Inferred TypeScript type for a row in the audit_log table. */
export type AuditLog = typeof auditLog.$inferSelect;

/** Inferred TypeScript type for inserting a row into the audit_log table. */
export type NewAuditLog = typeof auditLog.$inferInsert;
