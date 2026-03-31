/**
 * Audit log repository — data-access layer for the `audit_log` table.
 *
 * Each function accepts a Drizzle `db` instance as its first argument so that
 * callers (services, tests) can supply either a real connection or a mock
 * without any class instantiation.
 *
 * Audit log rows are immutable — they are inserted but never updated or deleted.
 *
 * @module repositories/audit.repository
 */

import { eq, desc, sql } from 'drizzle-orm';
import { auditLog } from '@i18n-platform/database';
import type { Database } from '@i18n-platform/database';

// ── Payload types ────────────────────────────────────────────────────────────

/**
 * Payload required to insert a new audit log entry.
 */
export interface CreateAuditEntryPayload {
  /** UUID of the organization the action occurred in. */
  orgId: string;
  /** Optional UUID of the project the action relates to. */
  projectId?: string;
  /** UUID of the user who performed the action. */
  userId?: string;
  /** Identifier of the action performed (e.g. 'translation.approve'). */
  action: string;
  /** Type of resource the action was performed on (e.g. 'translation'). */
  resourceType: string;
  /** UUID of the specific resource instance. */
  resourceId?: string;
  /** JSON snapshot of the resource before the change. */
  oldValue?: unknown;
  /** JSON snapshot of the resource after the change. */
  newValue?: unknown;
  /** IP address of the client. */
  ipAddress?: string;
}

// ── Functions ────────────────────────────────────────────────────────────────

/**
 * Inserts a new audit log entry and returns the created record.
 *
 * @param db - Drizzle ORM database instance.
 * @param entry - The audit data to record.
 * @returns The newly inserted audit log row.
 *
 * @example
 * ```ts
 * const log = await create(db, {
 *   orgId, projectId, userId,
 *   action: 'translation.approve',
 *   resourceType: 'translation',
 *   resourceId: translationId,
 * });
 * ```
 */
export async function create(db: Database, entry: CreateAuditEntryPayload) {
  const rows = await db
    .insert(auditLog)
    .values({
      orgId: entry.orgId,
      projectId: entry.projectId,
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      ipAddress: entry.ipAddress,
    })
    .returning();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}

/**
 * Returns a paginated list of audit log entries for a project, ordered by
 * creation time descending (most recent first).
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project to list entries for.
 * @param options - Pagination options.
 * @returns An object with the entries array and the total count.
 *
 * @example
 * ```ts
 * const { entries, total } = await findByProject(db, projectId, { offset: 0, limit: 20 });
 * ```
 */
export async function findByProject(
  db: Database,
  projectId: string,
  options: { offset: number; limit: number },
) {
  const [entries, countResult] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(eq(auditLog.projectId, projectId))
      .orderBy(desc(auditLog.createdAt))
      .limit(options.limit)
      .offset(options.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(eq(auditLog.projectId, projectId)),
  ]);

  return {
    entries,
    total: countResult[0]?.count ?? 0,
  };
}
