/**
 * Request/response middleware hooks.
 *
 * Fastify lifecycle hooks (onRequest, preHandler, onSend, …) for
 * cross-cutting concerns such as authentication guards, request tracing, and
 * error normalisation. For now this module serves as a placeholder.
 *
 * @module middleware
 */

export { authenticate } from './auth.js';
