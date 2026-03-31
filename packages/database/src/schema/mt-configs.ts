import {
  pgTable,
  uuid,
  varchar,
  boolean,
  real,
  decimal,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

/**
 * Machine translation configuration records define how a project integrates with
 * a specific MT provider for a given source→target locale pair.
 * Each combination of (project, source_locale, target_locale, provider) is unique.
 */
export const mtConfigs = pgTable(
  'mt_configs',
  {
    /** Primary key — randomly generated UUID. */
    id: uuid('id').defaultRandom().primaryKey(),

    /** Foreign key referencing the project this MT config belongs to. Cascades on delete. */
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),

    /** BCP-47 tag for the source locale used as input to the MT engine (max 35 chars). */
    sourceLocale: varchar('source_locale', { length: 35 }).notNull(),

    /** BCP-47 tag for the target locale produced by the MT engine (max 35 chars). */
    targetLocale: varchar('target_locale', { length: 35 }).notNull(),

    /** MT provider identifier, e.g. 'deepl', 'google', 'aws' (max 50 chars). */
    provider: varchar('provider', { length: 50 }).notNull(),

    /** Whether this MT configuration is active and will be used for new translations. */
    enabled: boolean('enabled').default(true).notNull(),

    /** When true, new untranslated keys are automatically sent to the MT provider. */
    autoTranslate: boolean('auto_translate').default(false).notNull(),

    /**
     * Quality score threshold (0–1) above which MT output is automatically approved.
     * Null means automatic approval is disabled.
     */
    autoApproveThreshold: real('auto_approve_threshold'),

    /** Provider-specific configuration (API keys, model choices, etc.) stored as JSON. */
    providerConfig: jsonb('provider_config').default({}),

    /**
     * Monthly spend budget in the project's billing currency (precision 10, scale 2).
     * Null means no budget cap is enforced.
     */
    costBudgetMonthly: decimal('cost_budget_monthly', { precision: 10, scale: 2 }),

    /**
     * Running total of MT spend in the current calendar month (precision 10, scale 2).
     * Reset automatically at the start of each month.
     */
    costSpentMonthly: decimal('cost_spent_monthly', { precision: 10, scale: 2 })
      .default('0')
      .notNull(),

    /** Timestamp when this MT configuration was created. */
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('mt_configs_project_locales_provider_idx').on(
      table.projectId,
      table.sourceLocale,
      table.targetLocale,
      table.provider,
    ),
    index('mt_configs_project_id_idx').on(table.projectId),
  ],
);

/** Inferred TypeScript type for a row in the mt_configs table. */
export type MtConfig = typeof mtConfigs.$inferSelect;

/** Inferred TypeScript type for inserting a row into the mt_configs table. */
export type NewMtConfig = typeof mtConfigs.$inferInsert;
