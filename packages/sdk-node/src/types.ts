/**
 * Types for the Node.js server SDK.
 *
 * @module types
 */

import type { I18nInstance } from '@i18n-platform/sdk-js';

/**
 * A server-side i18n instance that supports per-request translation.
 *
 * Extends the base {@link I18nInstance} with a `translate` method that
 * accepts an explicit locale, enabling thread-safe, per-request usage
 * without mutating shared state.
 */
export interface I18nServerInstance extends I18nInstance {
  /**
   * Translates `key` in the given `locale` without changing the instance's
   * active locale.
   *
   * Safe to call concurrently from multiple request handlers.
   *
   * @param locale - The locale to translate in
   * @param key - Translation key
   * @param params - Optional interpolation parameters
   * @returns The translated string, or `key` if not found
   */
  translate(
    locale: string,
    key: string,
    params?: Record<string, string | number>,
  ): string;
}

/**
 * A minimal representation of an incoming HTTP request, compatible with
 * Express, Fastify, and the Node.js built-in `http.IncomingMessage`.
 *
 * Used by {@link detectLocale} and the middleware helpers.
 */
export interface IncomingRequest {
  /** HTTP headers — `accept-language` is read for locale detection. */
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Augments the Express `Request` type with i18n helpers.
 *
 * Declare module augmentation in your application to get full type support:
 *
 * @example
 * ```ts
 * declare global {
 *   namespace Express {
 *     interface Request extends I18nRequestExtension {}
 *   }
 * }
 * ```
 */
export interface I18nRequestExtension {
  /**
   * Translates a key for the locale detected from the current request's
   * `Accept-Language` header.
   *
   * @param key - Translation key
   * @param params - Optional interpolation parameters
   * @returns The translated string
   */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** The locale detected from the current request. */
  locale: string;
}
