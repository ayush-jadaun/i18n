/**
 * @i18n-platform/api
 *
 * Public library surface for the REST API server package.
 *
 * Consumers (e.g. integration tests, CLI tooling) can import
 * {@link createApp} to spin up a configured Fastify instance without
 * going through the server entry point.
 *
 * @packageDocumentation
 */

export { createApp } from './app.js';
export { loadConfig } from './config.js';
export type { Config } from './config.js';
