/**
 * Business-logic service layer.
 *
 * Services orchestrate repositories, external adapters (MT, storage, …), and
 * domain rules. They are injected into route handlers via Fastify's DI
 * mechanism.
 *
 * @module services
 */

export * as authService from './auth.service.js';
export * as organizationService from './organization.service.js';
export * as projectService from './project.service.js';
export * as translationService from './translation.service.js';
export * as importExportService from './import-export.service.js';
export * as mtService from './mt.service.js';
export * as statsService from './stats.service.js';
