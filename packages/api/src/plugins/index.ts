/**
 * Fastify plugin registrations.
 *
 * This module will export and re-export Fastify plugins (authentication,
 * rate-limiting, request-id, etc.) as they are introduced. For now it
 * serves as a placeholder to keep the directory structure consistent.
 *
 * @module plugins
 */

export { default as jwtPlugin } from './jwt.js';
export { default as databasePlugin } from './database.js';
