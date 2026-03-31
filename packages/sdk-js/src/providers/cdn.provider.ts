/**
 * CDN provider — loads translations from a publicly accessible CDN.
 *
 * @module providers/cdn
 */

import type { ITranslationProvider } from '@i18n-platform/core';
import type { TranslationMap, Locale } from '@i18n-platform/core';

/**
 * Translation provider that fetches pre-built JSON bundles from a CDN.
 *
 * No authentication is required — bundles are served as public static files.
 *
 * URL patterns:
 * - Without namespace: `{cdnUrl}/{projectId}/latest/{locale}.json`
 * - With namespace:    `{cdnUrl}/{projectId}/latest/{locale}/{namespace}.json`
 *
 * @example
 * ```ts
 * const provider = new CdnProvider(
 *   'https://cdn.i18n-platform.com',
 *   'my-project-id',
 * );
 * const map = await provider.load('en');
 * ```
 */
export class CdnProvider implements ITranslationProvider {
  /** Identifies this provider to the runtime. */
  readonly providerId = 'cdn';

  /**
   * @param cdnUrl - Base URL of the CDN (no trailing slash)
   * @param projectId - Platform project identifier
   */
  constructor(
    private readonly cdnUrl: string,
    private readonly projectId: string,
  ) {}

  /**
   * Fetches the translation bundle for a locale, optionally scoped to a namespace.
   *
   * @param locale - BCP-47 locale code
   * @param namespace - Optional namespace; when provided a separate bundle file is fetched
   * @returns A flat key→value translation map
   * @throws {Error} When the HTTP response status is not OK
   */
  async load(locale: Locale, namespace?: string): Promise<TranslationMap> {
    const url = namespace
      ? `${this.cdnUrl}/${this.projectId}/latest/${locale}/${namespace}.json`
      : `${this.cdnUrl}/${this.projectId}/latest/${locale}.json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load translations: ${response.status}`);
    }

    return response.json() as Promise<TranslationMap>;
  }
}
