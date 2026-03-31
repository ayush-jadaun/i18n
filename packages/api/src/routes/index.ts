/**
 * Route registrations.
 *
 * Each feature area (translations, projects, users, …) will expose its own
 * Fastify plugin that gets re-exported and mounted here. For now this module
 * serves as a placeholder.
 *
 * @module routes
 */

export { authRoutes } from './auth.routes.js';
export { orgRoutes } from './org.routes.js';
export { projectRoutes } from './project.routes.js';
export { translationRoutes } from './translation.routes.js';
