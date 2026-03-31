/**
 * Organization and membership types for the i18n platform.
 * @module types/organization
 */

/**
 * Roles a member can hold within an organization.
 * Roles are hierarchical: owner > admin > developer > translator > reviewer.
 */
export type OrgRole = 'owner' | 'admin' | 'developer' | 'translator' | 'reviewer';

/** All valid organization roles in descending privilege order */
export const ORG_ROLES: readonly OrgRole[] = [
  'owner',
  'admin',
  'developer',
  'translator',
  'reviewer',
] as const;

/**
 * An organization that owns one or more i18n projects.
 */
export interface Organization {
  /** Unique organization identifier (UUID) */
  id: string;
  /** Human-readable display name of the organization */
  name: string;
  /** URL-safe slug derived from the organization name */
  slug: string;
  /** Organization-wide configuration settings */
  settings: OrganizationSettings;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
}

/**
 * Organization-level configuration that applies to all projects by default.
 */
export interface OrganizationSettings {
  /** Default machine-translation provider ID to use when none is specified at project level */
  defaultMtProvider?: string;
  /**
   * Default delivery mode for new projects.
   * One of `'api'`, `'cdn'`, or `'bundled'`.
   */
  defaultDeliveryMode?: string;
  /** Maximum number of projects this organization may create (undefined = unlimited) */
  maxProjects?: number;
}

/**
 * Per-project permissions granted to a member within an organization.
 * Keyed by project ID.
 */
export interface MemberPermissions {
  /**
   * Map of project ID to per-project access configuration.
   * A member may have a different role, locale scope, or namespace scope per project.
   */
  projects: Record<
    string,
    {
      /** Role the member holds within this specific project */
      role: OrgRole;
      /** Locale codes the member is permitted to translate (empty array = all locales) */
      locales: string[];
      /** Namespace names the member is permitted to access (empty array = all namespaces) */
      namespaces: string[];
    }
  >;
}

/**
 * Represents a user's membership in an organization.
 */
export interface OrgMember {
  /** Unique membership record identifier (UUID) */
  id: string;
  /** ID of the organization this membership belongs to */
  orgId: string;
  /** ID of the user holding this membership */
  userId: string;
  /** The member's role within the organization */
  role: OrgRole;
  /** Fine-grained per-project permissions for this member */
  permissions: MemberPermissions;
  /** ISO 8601 timestamp of when the user joined the organization */
  joinedAt: string;
}
