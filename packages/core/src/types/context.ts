/**
 * Translation-key context types for the i18n platform.
 *
 * Contexts provide visual or descriptive information that helps translators
 * understand how and where a key is used in the application.
 *
 * @module types/context
 */

/**
 * The kind of context artifact attached to a translation key.
 *
 * - `'screenshot'` — An image URL showing the key rendered in the UI.
 * - `'url'`        — A link to the page or view where the key appears.
 */
export type ContextType = 'screenshot' | 'url';

/**
 * A context artifact attached to a translation key.
 */
export interface KeyContext {
  /** Unique context record identifier (UUID) */
  id: string;
  /** ID of the translation key this context belongs to */
  keyId: string;
  /** Kind of context artifact */
  type: ContextType;
  /**
   * The artifact value.
   * - When `type` is `'screenshot'`: an absolute URL to the screenshot image.
   * - When `type` is `'url'`: the URL of the page or view.
   */
  value: string;
  /** Optional human-readable description of what the context shows */
  description?: string;
  /** ISO 8601 timestamp when this context record was created */
  createdAt: string;
}
