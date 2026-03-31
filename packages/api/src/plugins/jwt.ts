/**
 * JWT plugin registration for the i18n-platform API.
 *
 * Wraps `@fastify/jwt` with `fastify-plugin` so that the decorated
 * `app.jwt` and `request.jwtVerify()` helpers are available across all
 * route contexts (not scoped to a single encapsulation boundary).
 *
 * @module plugins/jwt
 */

import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config.js';

/**
 * Registers `@fastify/jwt` on the Fastify instance.
 *
 * @param app - The Fastify application instance.
 * @param opts - Plugin options containing the validated server {@link Config}.
 */
export default fp(async (app: FastifyInstance, opts: { config: Config }) => {
  await app.register(jwt, {
    secret: opts.config.jwtSecret,
    sign: { expiresIn: opts.config.jwtAccessTokenExpiry },
  });
});
