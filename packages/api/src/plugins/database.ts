/**
 * Database plugin registration for the i18n-platform API.
 *
 * Creates a Drizzle ORM database connection using `@i18n-platform/database`
 * and decorates the Fastify instance with it so that route handlers and
 * services can access `app.db` across all encapsulation scopes.
 *
 * @module plugins/database
 */

import fp from 'fastify-plugin';
import { createConnection } from '@i18n-platform/database';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';

/**
 * Registers the database connection as a Fastify decoration.
 *
 * @param app - The Fastify application instance.
 * @param opts - Plugin options containing the validated server {@link Config}.
 */
export default fp(async (app: FastifyInstance, opts: { config: Config }) => {
  const db = createConnection({ url: opts.config.databaseUrl });
  app.decorate('db', db);
});
