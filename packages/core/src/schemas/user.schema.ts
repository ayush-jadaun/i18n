/**
 * Zod schemas for user account creation, authentication, and preference updates.
 * @module schemas/user.schema
 */

import { z } from 'zod';

/**
 * Schema for creating a new user account.
 */
export const CreateUserSchema = z.object({
  /** User's email address (used as login identifier) */
  email: z.string().email('Must be a valid email address'),
  /** Display name shown in the UI and on translation credits */
  name: z.string().min(1, 'Name must not be empty'),
  /** Account password — minimum 8 characters */
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

/** Inferred TypeScript type for {@link CreateUserSchema}. */
export type CreateUser = z.infer<typeof CreateUserSchema>;

/**
 * Schema for user login / session creation.
 */
export const LoginSchema = z.object({
  /** User's registered email address */
  email: z.string().email('Must be a valid email address'),
  /** User's account password */
  password: z.string().min(1, 'Password must not be empty'),
});

/** Inferred TypeScript type for {@link LoginSchema}. */
export type Login = z.infer<typeof LoginSchema>;

/**
 * Schema for updating user display and notification preferences.
 * All fields are optional.
 */
export const UpdateUserPreferencesSchema = z.object({
  /**
   * BCP-47 locale code used for the dashboard UI.
   * @example "en", "fr"
   */
  dashboardLocale: z.string().min(1).optional(),
  /** UI color theme preference */
  theme: z.enum(['light', 'dark', 'system']).optional(),
  /** Whether to receive email notifications for review requests and comments */
  emailNotifications: z.boolean().optional(),
});

/** Inferred TypeScript type for {@link UpdateUserPreferencesSchema}. */
export type UpdateUserPreferences = z.infer<typeof UpdateUserPreferencesSchema>;
