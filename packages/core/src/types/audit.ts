/**
 * Audit log types for the i18n platform.
 *
 * Every significant state change performed by a user or automated process is
 * recorded as an immutable audit log entry for compliance and debugging.
 *
 * @module types/audit
 */

/**
 * A single immutable audit log entry recording a state-changing action.
 */
export interface AuditLogEntry {
  /** Unique audit log entry identifier (UUID) */
  id: string;
  /** ID of the organization in which the action occurred */
  orgId: string;
  /**
   * ID of the project in which the action occurred, or `null` for
   * organization-level actions (e.g., member invites, org settings changes).
   */
  projectId: string | null;
  /**
   * ID of the user who performed the action, or `null` for system/automated actions.
   */
  userId: string | null;
  /**
   * The action performed. Use one of the values from {@link AUDIT_ACTIONS}.
   */
  action: string;
  /**
   * The type of resource that was affected.
   * @example "translation", "project", "member", "api_key"
   */
  resourceType: string;
  /** ID of the specific resource that was affected */
  resourceId: string;
  /**
   * JSON-serializable snapshot of the resource state before the action.
   * `null` for creation events.
   */
  oldValue: unknown | null;
  /**
   * JSON-serializable snapshot of the resource state after the action.
   * `null` for deletion events.
   */
  newValue: unknown | null;
  /**
   * IP address of the client that originated the request, or `null` if unknown.
   */
  ipAddress: string | null;
  /** ISO 8601 timestamp when the audit entry was recorded */
  createdAt: string;
}

/**
 * Canonical audit action strings used throughout the platform.
 *
 * Grouped by resource type for discoverability.
 */
export const AUDIT_ACTIONS = {
  // ----- Organization -------------------------------------------------------
  /** Organization was created */
  ORG_CREATED: 'org.created',
  /** Organization settings were updated */
  ORG_UPDATED: 'org.updated',
  /** Organization was deleted */
  ORG_DELETED: 'org.deleted',

  // ----- Members ------------------------------------------------------------
  /** A user was invited to the organization */
  MEMBER_INVITED: 'member.invited',
  /** A member's role or permissions were updated */
  MEMBER_UPDATED: 'member.updated',
  /** A member was removed from the organization */
  MEMBER_REMOVED: 'member.removed',

  // ----- Projects -----------------------------------------------------------
  /** A new project was created */
  PROJECT_CREATED: 'project.created',
  /** Project settings were updated */
  PROJECT_UPDATED: 'project.updated',
  /** A project was deleted */
  PROJECT_DELETED: 'project.deleted',
  /** A locale was added to the project */
  PROJECT_LOCALE_ADDED: 'project.locale_added',
  /** A locale was removed from the project */
  PROJECT_LOCALE_REMOVED: 'project.locale_removed',
  /** A namespace was created */
  NAMESPACE_CREATED: 'namespace.created',
  /** A namespace was updated */
  NAMESPACE_UPDATED: 'namespace.updated',
  /** A namespace was deleted */
  NAMESPACE_DELETED: 'namespace.deleted',

  // ----- Translation keys ---------------------------------------------------
  /** A translation key was created */
  KEY_CREATED: 'key.created',
  /** A translation key was updated */
  KEY_UPDATED: 'key.updated',
  /** A translation key was deleted */
  KEY_DELETED: 'key.deleted',
  /** A batch of keys was imported */
  KEY_BULK_IMPORTED: 'key.bulk_imported',

  // ----- Translations -------------------------------------------------------
  /** A translation value was created or set */
  TRANSLATION_CREATED: 'translation.created',
  /** A translation value was updated */
  TRANSLATION_UPDATED: 'translation.updated',
  /** A translation was approved */
  TRANSLATION_APPROVED: 'translation.approved',
  /** A translation was rejected during review */
  TRANSLATION_REJECTED: 'translation.rejected',
  /** A translation was published to the delivery target */
  TRANSLATION_PUBLISHED: 'translation.published',

  // ----- Machine translation ------------------------------------------------
  /** An MT job was triggered */
  MT_JOB_TRIGGERED: 'mt.job_triggered',
  /** An MT job completed successfully */
  MT_JOB_COMPLETED: 'mt.job_completed',
  /** An MT job failed */
  MT_JOB_FAILED: 'mt.job_failed',

  // ----- API keys -----------------------------------------------------------
  /** An API key was created */
  API_KEY_CREATED: 'api_key.created',
  /** An API key was revoked */
  API_KEY_REVOKED: 'api_key.revoked',

  // ----- Publish ------------------------------------------------------------
  /** A publish operation was triggered */
  PUBLISH_TRIGGERED: 'publish.triggered',
  /** A publish operation completed successfully */
  PUBLISH_COMPLETED: 'publish.completed',
  /** A publish operation failed */
  PUBLISH_FAILED: 'publish.failed',
} as const;

/** Union type of all audit action string values */
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
