/**
 * API key types for the i18n platform.
 * @module types/api-key
 */

/**
 * Deployment environment an API key is scoped to.
 */
export type ApiKeyEnvironment = 'development' | 'staging' | 'production';

/** All valid API key environments */
export const API_KEY_ENVIRONMENTS: readonly ApiKeyEnvironment[] = [
  'development',
  'staging',
  'production',
] as const;

/**
 * Fine-grained capability scopes that can be granted to an API key.
 * Each field controls access to a specific resource group or operation set.
 */
export interface ApiKeyScopes {
  /**
   * Access to read and write translation values.
   * - `'read'` — fetch translations only
   * - `'write'` — fetch and push translated strings
   */
  translations: 'read' | 'write' | 'none';
  /**
   * Access to manage translation keys (create, update, delete).
   * - `'read'` — list and fetch key metadata
   * - `'write'` — create, update, and delete keys
   */
  keys: 'read' | 'write' | 'none';
  /**
   * Access to bulk import and export operations.
   * - `'read'` — export only
   * - `'write'` — import and export
   */
  importExport: 'read' | 'write' | 'none';
  /**
   * Access to machine-translation endpoints.
   * - `'read'` — fetch MT results and cost estimates
   * - `'write'` — trigger MT jobs
   */
  mt: 'read' | 'write' | 'none';
  /**
   * Access to publish translation bundles to the delivery target.
   * - `'write'` — trigger publish operations
   * - `'none'` — publishing disabled for this key
   */
  publish: 'write' | 'none';
}

/**
 * An API key used to authenticate CLI, SDK, and CI/CD requests.
 * The full key value is only returned once at creation time; only the prefix
 * is stored and returned in subsequent responses.
 */
export interface ApiKey {
  /** Unique API key record identifier (UUID) */
  id: string;
  /** ID of the project this key grants access to */
  projectId: string;
  /** Human-readable label identifying the key's intended use */
  name: string;
  /**
   * Public prefix of the key (e.g., `"i18n_live_abc123"`).
   * Used to identify the key in logs and UI without exposing the secret.
   */
  keyPrefix: string;
  /** Capability scopes granted to this key */
  scopes: ApiKeyScopes;
  /** Deployment environment this key is valid for */
  environment: ApiKeyEnvironment;
  /**
   * ISO 8601 expiry timestamp, or `null` if the key never expires.
   */
  expiresAt: string | null;
  /**
   * ISO 8601 timestamp of the most recent authenticated request using this key,
   * or `null` if the key has never been used.
   */
  lastUsedAt: string | null;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}
