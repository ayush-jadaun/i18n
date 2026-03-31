/**
 * Authentication middleware for the i18n-platform API.
 *
 * Provides a Fastify `preHandler` hook that verifies the JWT access token
 * supplied in the `Authorization: Bearer <token>` header. If verification
 * fails the request is rejected with a 401 response before it reaches any
 * route handler.
 *
 * @module middleware/auth
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Fastify preHandler that verifies the JWT Bearer token.
 *
 * Attach this as a `preHandler` on any route or route group that requires
 * an authenticated user:
 *
 * @example
 * ```ts
 * app.get('/api/v1/auth/me', { preHandler: authenticate }, handler);
 * ```
 *
 * On success `request.user` is populated with the decoded JWT payload
 * (`{ id, email }`). On failure a 401 JSON response is sent immediately.
 *
 * @param request - The incoming Fastify request.
 * @param reply - The Fastify reply object used to send error responses.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    await reply.status(401).send({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Invalid or expired token',
      },
    });
  }
}
