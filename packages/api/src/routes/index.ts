/**
 * Route registrations.
 *
 * Each feature area (translations, projects, users, …) will expose its own
 * Fastify plugin that gets re-exported and mounted here.
 *
 * @module routes
 */

export { authRoutes } from './auth.routes.js';
export { orgRoutes } from './org.routes.js';
export { projectRoutes } from './project.routes.js';
export { translationRoutes } from './translation.routes.js';
export { importExportRoutes } from './import-export.routes.js';
export { mtRoutes } from './mt.routes.js';
export { statsRoutes } from './stats.routes.js';
export { apiKeyRoutes } from './api-key.routes.js';
export { sdkRoutes } from './sdk.routes.js';
