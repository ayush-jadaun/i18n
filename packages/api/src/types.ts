/**
 * Global Fastify type augmentations for the i18n-platform API.
 *
 * Extends FastifyInstance with the decorated `db` property and
 * FastifyRequest with the JWT payload type so that TypeScript resolves
 * `request.user` and `request.jwtVerify()` correctly throughout the codebase.
 *
 * @module types
 */

import type { Database } from '@i18n-platform/database';

declare module 'fastify' {
  interface FastifyInstance {
    /** Drizzle ORM database instance, decorated by the database plugin. */
    db: Database;
  }

  interface FastifyRequest {
    /**
     * Verifies the JWT token from the Authorization header and populates
     * `request.user` with the decoded payload.
     */
    jwtVerify(): Promise<void>;

    /** Decoded JWT payload — populated after `jwtVerify()` succeeds. */
    user: { id: string; email: string };
  }
}
