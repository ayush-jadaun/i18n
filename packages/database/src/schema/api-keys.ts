import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

/**
 * API keys grant programmatic access to project resources.
 * The raw key is never stored; only a bcrypt/argon2 hash and a short prefix
 * used for identification are persisted.
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the project this API key grants access to. Cascades on delete. */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    /** Human-readable label for the key (max 200 chars). */
    name: varchar('name', { length: 200 }).notNull(),

    /** Hashed representation of the full API key (max 255 chars). Never store the raw key. */
    keyHash: varchar('key_hash', { length: 255 }).notNull(),

    /** Short prefix shown in the UI to help users identify their key, e.g. 'i18n_abc12' (max 12 chars). */
    keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),

    /**
     * JSON array of permission scopes granted to this key.
     * Example: ["translations:read", "translations:write"].
     */
    scopes: jsonb('scopes').notNull(),

    /**
     * Target deployment environment for this key.
     * Common values: 'development', 'staging', 'production'.
     */
    environment: varchar('environment', { length: 20 }).default('development').notNull(),

    /** Optional timestamp after which this key is no longer valid. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    /** Timestamp of the most recent successful request authenticated with this key. */
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

    /** Timestamp when the API key was created. */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('api_keys_project_id_idx').on(table.projectId),
    index('api_keys_key_prefix_idx').on(table.keyPrefix),
  ],
);

/** Inferred TypeScript type for a row in the api_keys table. */
export type ApiKey = typeof apiKeys.$inferSelect;

/** Inferred TypeScript type for inserting a row into the api_keys table. */
export type NewApiKey = typeof apiKeys.$inferInsert;
