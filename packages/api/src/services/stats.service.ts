/**
 * Statistics service — business logic for computing translation coverage
 * and status breakdowns at the project and organization levels.
 *
 * All functions are stateless and accept a Drizzle `db` instance as the first
 * argument for easy testing with mocks.
 *
 * @module services/stats.service
 */

import type { Database } from '@i18n-platform/database';
import { eq, and, sql } from 'drizzle-orm';
import {
  translationKeys,
  translations,
  projects,
  projectLocales,
} from '@i18n-platform/database';

// ── Types ────────────────────────────────────────────────────────────────────

/** Translation coverage stats for a single locale. */
export interface LocaleStats {
  /** BCP-47 locale tag. */
  locale: string;
  /** Number of keys that have a translation for this locale. */
  translatedCount: number;
  /** Translation coverage percentage (0–100). */
  coveragePercent: number;
  /** Breakdown of translations by status. */
  statusBreakdown: Record<string, number>;
}

/** Full statistics for a project. */
export interface ProjectStats {
  /** UUID of the project. */
  projectId: string;
  /** Total number of translation keys in the project. */
  totalKeys: number;
  /** Per-locale translation coverage and status breakdown. */
  locales: LocaleStats[];
}

/** Aggregate statistics for an organization. */
export interface OrgStats {
  /** UUID of the organization. */
  orgId: string;
  /** Total number of projects in the organization. */
  totalProjects: number;
  /** Total number of translation keys across all projects. */
  totalKeys: number;
  /** Per-project statistics. */
  projects: ProjectStats[];
}

// ── Project stats ────────────────────────────────────────────────────────────

/**
 * Computes translation statistics for a project.
 *
 * Returns the total number of keys and, for each configured locale, the
 * number of translated keys, coverage percentage, and a breakdown of
 * translations by status.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @returns A {@link ProjectStats} object.
 *
 * @example
 * ```ts
 * const stats = await getProjectStats(db, projectId);
 * console.log(stats.totalKeys, stats.locales[0].coveragePercent);
 * ```
 */
export async function getProjectStats(
  db: Database,
  projectId: string,
): Promise<ProjectStats> {
  // Count total keys.
  const keyCountResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(translationKeys)
    .where(eq(translationKeys.projectId, projectId));

  const totalKeys = keyCountResult[0]?.count ?? 0;

  // Get project's configured locales.
  const localeRows = await db
    .select()
    .from(projectLocales)
    .where(eq(projectLocales.projectId, projectId));

  const localeStats: LocaleStats[] = [];

  for (const localeRow of localeRows) {
    // Get translations for this locale.
    const translationRows = await db
      .select({
        status: translations.status,
        count: sql<number>`count(*)::int`,
      })
      .from(translations)
      .innerJoin(translationKeys, eq(translations.keyId, translationKeys.id))
      .where(
        and(
          eq(translationKeys.projectId, projectId),
          eq(translations.locale, localeRow.locale),
        ),
      )
      .groupBy(translations.status);

    const statusBreakdown: Record<string, number> = {};
    let translatedCount = 0;

    for (const row of translationRows) {
      statusBreakdown[row.status] = row.count;
      translatedCount += row.count;
    }

    localeStats.push({
      locale: localeRow.locale,
      translatedCount,
      coveragePercent: totalKeys > 0
        ? Math.round((translatedCount / totalKeys) * 10000) / 100
        : 0,
      statusBreakdown,
    });
  }

  return {
    projectId,
    totalKeys,
    locales: localeStats,
  };
}

// ── Organization stats ───────────────────────────────────────────────────────

/**
 * Computes aggregate translation statistics across all projects in an
 * organization.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization.
 * @returns An {@link OrgStats} object aggregating per-project statistics.
 *
 * @example
 * ```ts
 * const stats = await getOrgStats(db, orgId);
 * console.log(stats.totalProjects, stats.totalKeys);
 * ```
 */
export async function getOrgStats(
  db: Database,
  orgId: string,
): Promise<OrgStats> {
  // Get all projects for this org.
  const orgProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.orgId, orgId));

  let totalKeys = 0;
  const projectStats: ProjectStats[] = [];

  for (const project of orgProjects) {
    const stats = await getProjectStats(db, project.id);
    totalKeys += stats.totalKeys;
    projectStats.push(stats);
  }

  return {
    orgId,
    totalProjects: orgProjects.length,
    totalKeys,
    projects: projectStats,
  };
}
