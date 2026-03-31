/**
 * Drizzle ORM relation definitions for all schema tables.
 *
 * These relations power type-safe relational queries via `db.query.*` and
 * `withRelations`. They are co-located in a single file so the full entity
 * graph is visible at a glance.
 */

import { relations } from 'drizzle-orm';

import {
  organizations,
  users,
  orgMembers,
  projects,
  projectLocales,
  namespaces,
  translationKeys,
  translations,
  translationHistory,
  translationReviews,
  keyContexts,
  apiKeys,
  mtConfigs,
  mtQualityScores,
  auditLog,
} from './schema';

// ---------------------------------------------------------------------------
// organizations
// ---------------------------------------------------------------------------

/**
 * An organization owns many members, projects, and audit-log entries.
 */
export const organizationsRelations = relations(organizations, ({ many }) => ({
  /** Members who belong to this organization. */
  orgMembers: many(orgMembers),
  /** Projects created within this organization. */
  projects: many(projects),
  /** Audit log entries scoped to this organization. */
  auditLog: many(auditLog),
}));

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

/**
 * A user can be a member of many organizations and can author many reviews.
 */
export const usersRelations = relations(users, ({ many }) => ({
  /** Organization membership records for this user. */
  orgMembers: many(orgMembers),
  /** Translation reviews submitted by this user. */
  translationReviews: many(translationReviews),
}));

// ---------------------------------------------------------------------------
// orgMembers
// ---------------------------------------------------------------------------

/**
 * An org-member record belongs to exactly one organization and one user.
 */
export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  /** The organization this membership belongs to. */
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
  /** The user this membership belongs to. */
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

/**
 * A project belongs to one organization and owns many child resources.
 */
export const projectsRelations = relations(projects, ({ one, many }) => ({
  /** The organization that owns this project. */
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  /** Locale configurations enabled for this project. */
  projectLocales: many(projectLocales),
  /** Namespaces defined within this project. */
  namespaces: many(namespaces),
  /** Translation keys defined within this project. */
  translationKeys: many(translationKeys),
  /** API keys that grant access to this project. */
  apiKeys: many(apiKeys),
  /** Machine translation configurations for this project. */
  mtConfigs: many(mtConfigs),
}));

// ---------------------------------------------------------------------------
// projectLocales
// ---------------------------------------------------------------------------

/**
 * A project-locale record belongs to exactly one project.
 */
export const projectLocalesRelations = relations(projectLocales, ({ one }) => ({
  /** The project this locale configuration belongs to. */
  project: one(projects, {
    fields: [projectLocales.projectId],
    references: [projects.id],
  }),
}));

// ---------------------------------------------------------------------------
// namespaces
// ---------------------------------------------------------------------------

/**
 * A namespace belongs to one project and groups many translation keys.
 */
export const namespacesRelations = relations(namespaces, ({ one, many }) => ({
  /** The project this namespace belongs to. */
  project: one(projects, {
    fields: [namespaces.projectId],
    references: [projects.id],
  }),
  /** Translation keys that belong to this namespace. */
  translationKeys: many(translationKeys),
}));

// ---------------------------------------------------------------------------
// translationKeys
// ---------------------------------------------------------------------------

/**
 * A translation key belongs to one project and optionally one namespace,
 * and owns many translations and context attachments.
 */
export const translationKeysRelations = relations(translationKeys, ({ one, many }) => ({
  /** The project this key belongs to. */
  project: one(projects, {
    fields: [translationKeys.projectId],
    references: [projects.id],
  }),
  /** The optional namespace this key is grouped under. */
  namespace: one(namespaces, {
    fields: [translationKeys.namespaceId],
    references: [namespaces.id],
  }),
  /** Locale-specific translation values for this key. */
  translations: many(translations),
  /** Context attachments (screenshots, notes) for this key. */
  keyContexts: many(keyContexts),
}));

// ---------------------------------------------------------------------------
// translations
// ---------------------------------------------------------------------------

/**
 * A translation belongs to one key and owns history records and reviews.
 */
export const translationsRelations = relations(translations, ({ one, many }) => ({
  /** The translation key this value belongs to. */
  translationKey: one(translationKeys, {
    fields: [translations.keyId],
    references: [translationKeys.id],
  }),
  /** History of all changes made to this translation. */
  translationHistory: many(translationHistory),
  /** Reviewer actions performed on this translation. */
  translationReviews: many(translationReviews),
}));

// ---------------------------------------------------------------------------
// translationHistory
// ---------------------------------------------------------------------------

/**
 * A history record belongs to one translation and references the user who changed it.
 */
export const translationHistoryRelations = relations(translationHistory, ({ one }) => ({
  /** The translation this history record describes. */
  translation: one(translations, {
    fields: [translationHistory.translationId],
    references: [translations.id],
  }),
  /** The user who triggered this change, if still present in the system. */
  changedBy: one(users, {
    fields: [translationHistory.changedBy],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// translationReviews
// ---------------------------------------------------------------------------

/**
 * A review record belongs to one translation and one reviewer.
 */
export const translationReviewsRelations = relations(translationReviews, ({ one }) => ({
  /** The translation that was reviewed. */
  translation: one(translations, {
    fields: [translationReviews.translationId],
    references: [translations.id],
  }),
  /** The user who submitted the review. */
  reviewer: one(users, {
    fields: [translationReviews.reviewerId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// keyContexts
// ---------------------------------------------------------------------------

/**
 * A key context record belongs to exactly one translation key.
 */
export const keyContextsRelations = relations(keyContexts, ({ one }) => ({
  /** The translation key this context is attached to. */
  translationKey: one(translationKeys, {
    fields: [keyContexts.keyId],
    references: [translationKeys.id],
  }),
}));

// ---------------------------------------------------------------------------
// apiKeys
// ---------------------------------------------------------------------------

/**
 * An API key belongs to exactly one project.
 */
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  /** The project this API key grants access to. */
  project: one(projects, {
    fields: [apiKeys.projectId],
    references: [projects.id],
  }),
}));

// ---------------------------------------------------------------------------
// mtConfigs
// ---------------------------------------------------------------------------

/**
 * An MT config belongs to one project and owns many quality-score snapshots.
 */
export const mtConfigsRelations = relations(mtConfigs, ({ one, many }) => ({
  /** The project this MT configuration belongs to. */
  project: one(projects, {
    fields: [mtConfigs.projectId],
    references: [projects.id],
  }),
  /** Quality score snapshots collected for this MT configuration. */
  mtQualityScores: many(mtQualityScores),
}));

// ---------------------------------------------------------------------------
// mtQualityScores
// ---------------------------------------------------------------------------

/**
 * A quality score snapshot belongs to exactly one MT config.
 */
export const mtQualityScoresRelations = relations(mtQualityScores, ({ one }) => ({
  /** The MT config this score snapshot belongs to. */
  mtConfig: one(mtConfigs, {
    fields: [mtQualityScores.mtConfigId],
    references: [mtConfigs.id],
  }),
}));

// ---------------------------------------------------------------------------
// auditLog
// ---------------------------------------------------------------------------

/**
 * An audit log entry belongs to one organization and references an optional user.
 */
export const auditLogRelations = relations(auditLog, ({ one }) => ({
  /** The organization in which the audited action occurred. */
  organization: one(organizations, {
    fields: [auditLog.orgId],
    references: [organizations.id],
  }),
  /** The user who performed the audited action, if still present in the system. */
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));
