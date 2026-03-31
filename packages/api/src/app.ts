/**
 * Fastify application factory.
 *
 * Responsible for constructing and configuring the Fastify instance:
 * registers global plugins (CORS, JWT, database) and mounts top-level routes
 * such as the health-check and authentication endpoints. Route-level plugins
 * and business-logic routes are added by the respective `routes/` modules.
 *
 * @module app
 */

import './types.js';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { Config } from './config.js';
import jwtPlugin from './plugins/jwt.js';
import databasePlugin from './plugins/database.js';
import { authRoutes } from './routes/auth.routes.js';
import { orgRoutes } from './routes/org.routes.js';
import { projectRoutes } from './routes/project.routes.js';
import { translationRoutes } from './routes/translation.routes.js';
import { importExportRoutes } from './routes/import-export.routes.js';
import { mtRoutes } from './routes/mt.routes.js';
import { statsRoutes } from './routes/stats.routes.js';
import { apiKeyRoutes } from './routes/api-key.routes.js';
import { sdkRoutes } from './routes/sdk.routes.js';

/**
 * Creates and configures a Fastify application instance.
 *
 * Registers in order:
 * 1. CORS — cross-origin policy for browser clients
 * 2. Database plugin — decorates `app.db` with a Drizzle connection
 * 3. JWT plugin — registers `app.jwt`, `request.jwtVerify()`, etc.
 * 4. Auth routes — `POST /api/v1/auth/register`, `login`, `refresh`, `GET /me`
 * 5. Org routes — organization CRUD and member management under `/api/v1/orgs`
 * 6. Project routes — project, locale, and namespace CRUD under `/api/v1`
 * 7. Translation routes — key CRUD, translation upsert, review workflow under `/api/v1`
 * 8. Import/export routes — file import and export under `/api/v1`
 * 9. MT routes — machine translation trigger and config under `/api/v1`
 * 10. Stats routes — project and org statistics, audit log under `/api/v1`
 * 11. API key routes — API key management under `/api/v1`
 * 12. SDK routes — public SDK delivery endpoints under `/api/v1/sdk`
 *
 * @param config - Validated server configuration produced by {@link loadConfig}.
 * @returns A fully initialised Fastify instance, ready to call `listen()` on.
 *
 * @example
 * ```ts
 * import { loadConfig } from './config';
 * import { createApp } from './app';
 *
 * const config = loadConfig();
 * const app = await createApp(config);
 * await app.listen({ port: config.port, host: config.host });
 * ```
 */
export async function createApp(config: Config) {
  const app = Fastify({
    logger: { level: config.logLevel },
  });

  // ── Global plugins ────────────────────────────────────────────────────────

  await app.register(cors, {
    origin: config.corsOrigins.split(',').map((s) => s.trim()),
    credentials: true,
  });

  await app.register(databasePlugin, { config });
  await app.register(jwtPlugin, { config });

  // ── Health check ──────────────────────────────────────────────────────────
  /**
   * GET /health
   *
   * Lightweight liveness probe used by load balancers and container
   * orchestrators to verify the server process is running.
   *
   * @returns `{ status: 'ok', timestamp: <ISO-8601 string> }`
   */
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // ── Feature routes ────────────────────────────────────────────────────────

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(orgRoutes, { prefix: '/api/v1/orgs' });
  await app.register(projectRoutes, { prefix: '/api/v1' });
  await app.register(translationRoutes, { prefix: '/api/v1' });
  await app.register(importExportRoutes, { prefix: '/api/v1' });
  await app.register(mtRoutes, { prefix: '/api/v1' });
  await app.register(statsRoutes, { prefix: '/api/v1' });
  await app.register(apiKeyRoutes, { prefix: '/api/v1' });
  await app.register(sdkRoutes, { prefix: '/api/v1/sdk' });

  return app;
}
