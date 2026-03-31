/**
 * API provider — loads translations from the i18n platform REST API.
 *
 * @module providers/api
 */

import type { ITranslationProvider } from '@i18n-platform/core';
import type { TranslationMap, Locale } from '@i18n-platform/core';

/**
 * Translation provider that fetches data from the i18n platform API.
 *
 * Requires a valid project API key passed in the `Authorization` header.
 *
 * URL patterns:
 * - Without namespace: `{apiUrl}/sdk/{projectId}/{locale}`
 * - With namespace:    `{apiUrl}/sdk/{projectId}/{locale}/{namespace}`
 *
 * @example
 * ```ts
 * const provider = new ApiProvider(
 *   'https://api.i18n-platform.com',
 *   'my-api-key',
 *   'my-project-id',
 * );
 * const map = await provider.load('en', 'common');
 * ```
 */
export class ApiProvider implements ITranslationProvider {
  /** Identifies this provider to the runtime. */
  readonly providerId = 'api';

  /**
   * @param apiUrl - Base URL of the platform API (no trailing slash)
   * @param apiKey - Bearer token used in the `Authorization` header
   * @param projectId - Platform project identifier
   */
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
    private readonly projectId: string,
  ) {}

  /**
   * Fetches the translation map for a locale, optionally scoped to a namespace.
   *
   * @param locale - BCP-47 locale code
   * @param namespace - Optional namespace to scope the request
   * @returns A flat key→value translation map
   * @throws {Error} When the HTTP response status is not OK
   */
  async load(locale: Locale, namespace?: string): Promise<TranslationMap> {
    const url = namespace
      ? `${this.apiUrl}/sdk/${this.projectId}/${locale}/${namespace}`
      : `${this.apiUrl}/sdk/${this.projectId}/${locale}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to load translations: ${response.status}`);
    }

    return response.json() as Promise<TranslationMap>;
  }
}
