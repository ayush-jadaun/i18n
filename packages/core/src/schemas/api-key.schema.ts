/**
 * Zod schemas for API key creation and management.
 * @module schemas/api-key.schema
 */

import { z } from 'zod';
import { API_KEY_ENVIRONMENTS } from '../types/api-key';

/** Valid scope access levels for most API key capabilities. */
const ScopeAccessSchema = z.enum(['read', 'write', 'none']);

/** Valid scope access levels for the publish capability (write or none only). */
const PublishScopeSchema = z.enum(['write', 'none']);

/**
 * Schema for creating a new API key.
 */
export const CreateApiKeySchema = z.object({
  /** Human-readable label identifying the key's intended use */
  name: z.string().min(1, 'API key name must not be empty'),
  /** Deployment environment this key is scoped to */
  environment: z.enum(API_KEY_ENVIRONMENTS as [string, ...string[]], {
    errorMap: () => ({
      message: `Environment must be one of: ${API_KEY_ENVIRONMENTS.join(', ')}`,
    }),
  }),
  /** Fine-grained capability scopes granted to this key */
  scopes: z.object({
    /**
     * Access level for translation read/write operations.
     * - `'read'` — fetch translations only
     * - `'write'` — fetch and push translated strings
     * - `'none'` — no access
     */
    translations: ScopeAccessSchema,
    /**
     * Access level for translation key management.
     * - `'read'` — list and fetch key metadata
     * - `'write'` — create, update, and delete keys
     * - `'none'` — no access
     */
    keys: ScopeAccessSchema,
    /**
     * Access level for bulk import/export operations.
     * - `'read'` — export only
     * - `'write'` — import and export
     * - `'none'` — no access
     */
    importExport: ScopeAccessSchema,
    /**
     * Access level for machine-translation endpoints.
     * - `'read'` — fetch MT results and cost estimates
     * - `'write'` — trigger MT jobs
     * - `'none'` — no access
     */
    mt: ScopeAccessSchema,
    /**
     * Access level for publishing translation bundles.
     * - `'write'` — trigger publish operations
     * - `'none'` — publishing disabled for this key
     */
    publish: PublishScopeSchema,
  }),
  /**
   * Optional ISO 8601 expiry datetime string.
   * Pass `null` or omit to create a non-expiring key.
   */
  expiresAt: z.string().datetime({ message: 'expiresAt must be a valid ISO 8601 datetime' }).optional(),
});

/** Inferred TypeScript type for {@link CreateApiKeySchema}. */
export type CreateApiKey = z.infer<typeof CreateApiKeySchema>;
