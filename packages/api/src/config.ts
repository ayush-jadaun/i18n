/**
 * Environment configuration loading and validation for the API server.
 *
 * All configuration is sourced from environment variables and validated
 * with Zod at startup; the server will fail fast if required vars are missing.
 *
 * @module config
 */

import { z } from 'zod';

/**
 * Zod schema that defines and validates every environment variable consumed
 * by the API server.
 */
const ConfigSchema = z.object({
  /** TCP port the HTTP server listens on. */
  port: z.coerce.number().default(3000),

  /** Network interface the HTTP server binds to. */
  host: z.string().default('0.0.0.0'),

  /** PostgreSQL connection URL. */
  databaseUrl: z.string().url(),

  /** Redis connection URL used for caching and rate-limiting state. */
  redisUrl: z.string().url(),

  /** Secret used to sign and verify JWT tokens — minimum 16 characters. */
  jwtSecret: z.string().min(16),

  /** Lifetime of access tokens (e.g. `"15m"`). */
  jwtAccessTokenExpiry: z.string().default('15m'),

  /** Lifetime of refresh tokens (e.g. `"7d"`). */
  jwtRefreshTokenExpiry: z.string().default('7d'),

  /**
   * Comma-separated list of allowed CORS origins
   * (e.g. `"http://localhost:3001,https://app.example.com"`).
   */
  corsOrigins: z.string().default('http://localhost:3001'),

  /** Fastify / pino log level. */
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Validated, typed configuration object for the API server.
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Reads environment variables, validates them against {@link ConfigSchema},
 * and returns a typed {@link Config} object.
 *
 * @throws {ZodError} When required environment variables are absent or invalid.
 *
 * @example
 * ```ts
 * import { loadConfig } from './config';
 *
 * const config = loadConfig();
 * console.log(config.port); // 3000
 * ```
 */
export function loadConfig(): Config {
  return ConfigSchema.parse({
    port: process.env['API_PORT'],
    host: process.env['API_HOST'],
    databaseUrl: process.env['DATABASE_URL'],
    redisUrl: process.env['REDIS_URL'],
    jwtSecret: process.env['JWT_SECRET'],
    jwtAccessTokenExpiry: process.env['JWT_ACCESS_TOKEN_EXPIRY'],
    jwtRefreshTokenExpiry: process.env['JWT_REFRESH_TOKEN_EXPIRY'],
    corsOrigins: process.env['CORS_ORIGINS'],
    logLevel: process.env['LOG_LEVEL'],
  });
}
