/**
 * Zod schemas for organization creation, update, and member invitation.
 * @module schemas/organization.schema
 */

import { z } from 'zod';
import { SlugSchema } from './locale.schema';

/** All valid organization member roles. */
const ORG_ROLES = ['owner', 'admin', 'developer', 'translator', 'reviewer'] as const;

/**
 * Schema for creating a new organization.
 */
export const CreateOrganizationSchema = z.object({
  /** Human-readable display name of the organization */
  name: z.string().min(1, 'Organization name must not be empty'),
  /** URL-safe slug (globally unique) */
  slug: SlugSchema,
});

/** Inferred TypeScript type for {@link CreateOrganizationSchema}. */
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;

/** Reusable organization settings sub-schema. */
const OrganizationSettingsSchema = z.object({
  /** Default MT provider ID for new projects */
  defaultMtProvider: z.string().optional(),
  /** Default delivery mode for new projects */
  defaultDeliveryMode: z.string().optional(),
  /** Maximum number of projects this org may create */
  maxProjects: z.number().positive().optional(),
});

/**
 * Schema for partially updating an existing organization.
 */
export const UpdateOrganizationSchema = z.object({
  /** New display name for the organization */
  name: z.string().min(1).optional(),
  /** Updated organization settings */
  settings: OrganizationSettingsSchema.optional(),
});

/** Inferred TypeScript type for {@link UpdateOrganizationSchema}. */
export type UpdateOrganization = z.infer<typeof UpdateOrganizationSchema>;

/**
 * Schema for inviting a new member to an organization.
 */
export const InviteMemberSchema = z.object({
  /** Email address to send the invitation to */
  email: z.string().email('Must be a valid email address'),
  /** Role to grant the invited member */
  role: z.enum(ORG_ROLES, {
    errorMap: () => ({
      message: `Role must be one of: ${ORG_ROLES.join(', ')}`,
    }),
  }),
  /** Optional fine-grained per-project permissions for the invited member */
  permissions: z
    .object({
      projects: z.record(
        z.object({
          role: z.enum(ORG_ROLES),
          locales: z.array(z.string()),
          namespaces: z.array(z.string()),
        })
      ),
    })
    .optional(),
});

/** Inferred TypeScript type for {@link InviteMemberSchema}. */
export type InviteMember = z.infer<typeof InviteMemberSchema>;
