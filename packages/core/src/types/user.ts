/**
 * User account and preference types for the i18n platform.
 * @module types/user
 */

/**
 * User display and notification preferences.
 */
export interface UserPreferences {
  /**
   * BCP-47 locale code used for the dashboard UI.
   * @example "en", "fr", "ja"
   */
  dashboardLocale: string;
  /** UI color theme preference */
  theme: 'light' | 'dark' | 'system';
  /** Whether to receive email notifications for review requests, comments, etc. */
  emailNotifications: boolean;
}

/**
 * Default user preferences applied to new accounts.
 */
export const DEFAULT_USER_PREFERENCES: Readonly<UserPreferences> = {
  dashboardLocale: 'en',
  theme: 'system',
  emailNotifications: true,
} as const;

/**
 * A registered user of the i18n platform.
 */
export interface User {
  /** Unique user identifier (UUID) */
  id: string;
  /** User's verified email address */
  email: string;
  /** Display name shown in the UI and on translation credits */
  name: string;
  /** URL to the user's avatar image, or `null` if not set */
  avatarUrl: string | null;
  /** Dashboard and notification preferences */
  preferences: UserPreferences;
  /** ISO 8601 account-creation timestamp */
  createdAt: string;
}
