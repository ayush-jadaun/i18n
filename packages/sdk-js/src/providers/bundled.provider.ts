/**
 * Bundled provider — loads translations from in-memory data shipped with the app.
 *
 * @module providers/bundled
 */

import type { ITranslationProvider } from '@i18n-platform/core';
import type { TranslationMap, Locale } from '@i18n-platform/core';

/**
 * Translation provider backed by pre-bundled, in-memory translation maps.
 *
 * Use this when you want to ship translations inside your JavaScript bundle
 * rather than fetching them at runtime.  Ideal for SSR, offline, and
 * environments without network access.
 *
 * The `namespace` parameter is intentionally ignored because bundled
 * translations are expected to be pre-merged into a single map per locale.
 *
 * @example
 * ```ts
 * const provider = new BundledProvider({
 *   en: { 'hello': 'Hello', 'bye': 'Goodbye' },
 *   fr: { 'hello': 'Bonjour', 'bye': 'Au revoir' },
 * });
 * const map = await provider.load('en'); // { hello: 'Hello', bye: 'Goodbye' }
 * ```
 */
export class BundledProvider implements ITranslationProvider {
  /** Identifies this provider to the runtime. */
  readonly providerId = 'bundled';

  /**
   * @param translations - Map of locale code → flat translation map
   */
  constructor(
    private readonly translations: Record<string, TranslationMap>,
  ) {}

  /**
   * Returns the pre-bundled translation map for the requested locale.
   *
   * @param locale - BCP-47 locale code
   * @returns The stored map, or an empty object when the locale is absent
   */
  async load(locale: Locale): Promise<TranslationMap> {
    return this.translations[locale] ?? {};
  }
}
