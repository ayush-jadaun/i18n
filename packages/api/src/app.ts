/**
 * Fastify application factory.
 *
 * Responsible for constructing and configuring the Fastify instance:
 * registers global plugins (CORS, …) and mounts top-level routes such as
 * the health-check endpoint. Route-level plugins and business-logic routes
 * are added by the respective `routes/` modules as the platform grows.
 *
 * @module app
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { Config } from './config.js';

/**
 * Creates and configures a Fastify application instance.
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

  await app.register(cors, {
    origin: config.corsOrigins.split(',').map((s) => s.trim()),
    credentials: true,
  });

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

  return app;
}
