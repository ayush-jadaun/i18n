import { pgTable, uuid, varchar, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/** Default user preferences applied to every new account. */
const DEFAULT_USER_PREFERENCES = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    inApp: true,
  },
};

/**
 * Platform users — human actors who authenticate and interact with the dashboard.
 * A user can be a member of multiple organizations.
 */
export const users = pgTable(
  'users',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Unique email address used for authentication (max 320 chars per RFC 5321). */
    email: varchar('email', { length: 320 }).notNull(),

    /** Display name shown in the dashboard UI (max 200 chars). */
    name: varchar('name', { length: 200 }).notNull(),

    /** bcrypt/argon2 password hash. Null for SSO-only accounts. */
    passwordHash: varchar('password_hash', { length: 255 }),

    /** URL of the user's avatar image (max 2048 chars). */
    avatarUrl: varchar('avatar_url', { length: 2048 }),

    /** JSON preferences bag — theme, locale, notification settings, etc. */
    preferences: jsonb('preferences').default(DEFAULT_USER_PREFERENCES),

    /** Timestamp when the user account was created. */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)],
);

/** Inferred TypeScript type for a row in the users table. */
export type User = typeof users.$inferSelect;

/** Inferred TypeScript type for inserting a row into the users table. */
export type NewUser = typeof users.$inferInsert;
