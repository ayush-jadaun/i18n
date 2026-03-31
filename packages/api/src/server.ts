/**
 * Server entry point.
 *
 * Bootstraps the application by loading configuration from the environment,
 * creating the Fastify app, and starting the HTTP listener. This module is
 * intended to be executed directly (e.g. via `tsx src/server.ts` in dev or
 * `node dist/index.js` in production) — it is NOT part of the public library
 * surface exported from `src/index.ts`.
 *
 * @module server
 */

import { loadConfig } from './config.js';
import { createApp } from './app.js';

/**
 * Bootstraps and starts the API server.
 *
 * Exits the process with code `1` on any startup failure so that container
 * orchestrators correctly detect the crash.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const app = await createApp(config);

  await app.listen({ port: config.port, host: config.host });
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
