/**
 * Project service — business logic for project, locale, and namespace management.
 *
 * All functions are stateless and accept a Drizzle `db` instance as the first
 * argument so they are easy to unit-test with mocks.
 *
 * Errors from `@i18n-platform/core` are thrown directly and mapped to HTTP
 * responses in the route layer.
 *
 * @module services/project.service
 */

import type { Database } from '@i18n-platform/database';
import { NotFoundError, ConflictError } from '@i18n-platform/core';
import * as projectRepo from '../repositories/project.repository.js';
import * as localeRepo from '../repositories/locale.repository.js';
import * as namespaceRepo from '../repositories/namespace.repository.js';

// ── Projects ──────────────────────────────────────────────────────────────────

/**
 * Creates a new project, seeds all supported locales, and creates the default
 * "common" namespace.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization that owns this project.
 * @param data - Project creation payload.
 * @returns The newly created project row.
 * @throws {@link ConflictError} when the slug is already taken within the org.
 *
 * @example
 * ```ts
 * const project = await createProject(db, orgId, {
 *   name: 'Web App',
 *   slug: 'web-app',
 *   defaultLocale: 'en',
 *   supportedLocales: ['en', 'fr'],
 *   delivery: 'cdn',
 * });
 * ```
 */
export async function createProject(
  db: Database,
  orgId: string,
  data: {
    name: string;
    slug: string;
    defaultLocale: string;
    supportedLocales: string[];
    delivery: string;
    settings?: Record<string, unknown>;
  },
) {
  // Check for slug uniqueness within the org before inserting.
  const existing = await projectRepo.findByOrgAndSlug(db, orgId, data.slug);
  if (existing) {
    throw new ConflictError(
      `A project with the slug "${data.slug}" already exists in this organization`,
    );
  }

  const project = await projectRepo.create(db, {
    orgId,
    name: data.name,
    slug: data.slug,
    defaultLocale: data.defaultLocale,
    deliveryMode: data.delivery,
    settings: data.settings,
  });

  // Seed all supported locales concurrently.
  await Promise.all(
    data.supportedLocales.map((locale) =>
      localeRepo.addLocale(db, { projectId: project.id, locale }),
    ),
  );

  // Always create the default "common" namespace.
  await namespaceRepo.create(db, {
    projectId: project.id,
    name: 'common',
    description: 'Common shared strings',
  });

  return project;
}

/**
 * Returns a single project enriched with its locales and namespaces.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @returns The project row with attached `locales` and `namespaces` arrays.
 * @throws {@link NotFoundError} when no project with that ID exists.
 *
 * @example
 * ```ts
 * const project = await getProject(db, projectId);
 * console.log(project.locales, project.namespaces);
 * ```
 */
export async function getProject(db: Database, projectId: string) {
  const project = await projectRepo.findById(db, projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const [locales, nsList] = await Promise.all([
    localeRepo.findByProject(db, projectId),
    namespaceRepo.findByProject(db, projectId),
  ]);

  return { ...project, locales, namespaces: nsList };
}

/**
 * Lists all projects belonging to an organization.
 *
 * @param db - Drizzle ORM database instance.
 * @param orgId - UUID of the organization.
 * @returns Array of project rows (may be empty).
 *
 * @example
 * ```ts
 * const projects = await listProjects(db, orgId);
 * ```
 */
export async function listProjects(db: Database, orgId: string) {
  return projectRepo.findByOrgId(db, orgId);
}

/**
 * Applies a partial update to a project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project to update.
 * @param data - Fields to update.
 * @returns The updated project row.
 * @throws {@link NotFoundError} when no project with that ID exists.
 * @throws {@link ConflictError} when the new slug conflicts with an existing project.
 *
 * @example
 * ```ts
 * const updated = await updateProject(db, projectId, { name: 'New Name' });
 * ```
 */
export async function updateProject(
  db: Database,
  projectId: string,
  data: {
    name?: string;
    slug?: string;
    defaultLocale?: string;
    delivery?: string;
    settings?: Record<string, unknown>;
  },
) {
  const project = await projectRepo.findById(db, projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // If the slug is changing, verify it won't conflict with another project in the same org.
  if (data.slug && data.slug !== project.slug) {
    const conflict = await projectRepo.findByOrgAndSlug(db, project.orgId, data.slug);
    if (conflict) {
      throw new ConflictError(
        `A project with the slug "${data.slug}" already exists in this organization`,
      );
    }
  }

  const updated = await projectRepo.update(db, projectId, {
    name: data.name,
    slug: data.slug,
    defaultLocale: data.defaultLocale,
    deliveryMode: data.delivery,
    settings: data.settings,
  });

  if (!updated) {
    throw new NotFoundError('Project not found');
  }

  return updated;
}

/**
 * Deletes a project and all its child records (via cascade).
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project to delete.
 * @throws {@link NotFoundError} when no project with that ID exists.
 *
 * @example
 * ```ts
 * await deleteProject(db, projectId);
 * ```
 */
export async function deleteProject(db: Database, projectId: string) {
  const project = await projectRepo.findById(db, projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  await projectRepo.remove(db, projectId);
}

// ── Locales ───────────────────────────────────────────────────────────────────

/**
 * Adds a locale to an existing project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @param locale - BCP-47 locale tag to add.
 * @returns The newly created project_locale row.
 * @throws {@link NotFoundError} when no project with that ID exists.
 * @throws {@link ConflictError} when the locale is already registered for the project.
 *
 * @example
 * ```ts
 * const pl = await addLocale(db, projectId, 'fr-CA');
 * ```
 */
export async function addLocale(db: Database, projectId: string, locale: string) {
  const project = await projectRepo.findById(db, projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check for duplicate locale before inserting to provide a friendly error.
  const existing = await localeRepo.findByProject(db, projectId);
  if (existing.some((l) => l.locale === locale)) {
    throw new ConflictError(`Locale "${locale}" is already registered for this project`);
  }

  return localeRepo.addLocale(db, { projectId, locale });
}

/**
 * Removes a locale from a project by its project_locale row ID.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project (used for scoping the lookup).
 * @param localeId - UUID of the project_locale row to delete.
 * @throws {@link NotFoundError} when no matching locale row exists for this project.
 *
 * @example
 * ```ts
 * await removeLocale(db, projectId, localeId);
 * ```
 */
export async function removeLocale(db: Database, projectId: string, localeId: string) {
  const locales = await localeRepo.findByProject(db, projectId);
  const locale = locales.find((l) => l.id === localeId);

  if (!locale) {
    throw new NotFoundError('Locale not found for this project');
  }

  await localeRepo.remove(db, localeId);
}

// ── Namespaces ────────────────────────────────────────────────────────────────

/**
 * Creates a new namespace within a project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @param data - Namespace name and optional description.
 * @returns The newly created namespace row.
 * @throws {@link NotFoundError} when no project with that ID exists.
 * @throws {@link ConflictError} when the namespace name already exists in the project.
 *
 * @example
 * ```ts
 * const ns = await createNamespace(db, projectId, { name: 'auth', description: 'Auth strings' });
 * ```
 */
export async function createNamespace(
  db: Database,
  projectId: string,
  data: { name: string; description?: string },
) {
  const project = await projectRepo.findById(db, projectId);

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check for duplicate namespace name before inserting.
  const existing = await namespaceRepo.findByProject(db, projectId);
  if (existing.some((ns) => ns.name === data.name)) {
    throw new ConflictError(
      `Namespace "${data.name}" already exists in this project`,
    );
  }

  return namespaceRepo.create(db, { projectId, name: data.name, description: data.description });
}

/**
 * Applies a partial update to a namespace.
 *
 * @param db - Drizzle ORM database instance.
 * @param namespaceId - UUID of the namespace to update.
 * @param data - Fields to update (name, description, sortOrder).
 * @returns The updated namespace row.
 * @throws {@link NotFoundError} when no namespace with that ID exists.
 *
 * @example
 * ```ts
 * const updated = await updateNamespace(db, namespaceId, { description: 'Auth strings' });
 * ```
 */
export async function updateNamespace(
  db: Database,
  namespaceId: string,
  data: { name?: string; description?: string; sortOrder?: number },
) {
  const ns = await namespaceRepo.findById(db, namespaceId);

  if (!ns) {
    throw new NotFoundError('Namespace not found');
  }

  const updated = await namespaceRepo.update(db, namespaceId, data);

  if (!updated) {
    throw new NotFoundError('Namespace not found');
  }

  return updated;
}

/**
 * Deletes a namespace and all its child records (via cascade).
 *
 * @param db - Drizzle ORM database instance.
 * @param namespaceId - UUID of the namespace to delete.
 * @throws {@link NotFoundError} when no namespace with that ID exists.
 *
 * @example
 * ```ts
 * await deleteNamespace(db, namespaceId);
 * ```
 */
export async function deleteNamespace(db: Database, namespaceId: string) {
  const ns = await namespaceRepo.findById(db, namespaceId);

  if (!ns) {
    throw new NotFoundError('Namespace not found');
  }

  await namespaceRepo.remove(db, namespaceId);
}
