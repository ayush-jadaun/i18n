/**
 * Translation provider interface for loading and subscribing to translation data.
 *
 * Implement this interface to integrate a custom translation backend
 * (e.g., REST API, local file system, in-memory store).
 *
 * @module interfaces/translation-provider
 */

import type { TranslationMap, Locale } from '../types';

/**
 * A function that cancels an active subscription.
 * Call the returned value to stop receiving change notifications.
 */
export type Unsubscribe = () => void;

/**
 * Provider that supplies translation data to the i18n runtime.
 *
 * @example
 * ```ts
 * class ApiTranslationProvider implements ITranslationProvider {
 *   readonly providerId = 'api';
 *
 *   async load(locale: Locale, namespace: string): Promise<TranslationMap> {
 *     const res = await fetch(`/api/translations/${locale}/${namespace}`);
 *     return res.json() as Promise<TranslationMap>;
 *   }
 * }
 * ```
 */
export interface ITranslationProvider {
  /**
   * Unique identifier for this provider.
   * @example "api", "filesystem", "in-memory"
   */
  readonly providerId: string;

  /**
   * Loads the translation map for the given locale and namespace.
   *
   * @param locale - BCP-47 locale code to load translations for
   * @param namespace - Namespace (file/group name) to load
   * @returns A flat map of translation keys to their string values
   * @throws {Error} If the translations cannot be loaded
   */
  load(locale: Locale, namespace: string): Promise<TranslationMap>;

  /**
   * Subscribes to live updates for a locale/namespace pair.
   *
   * When the underlying source changes (e.g., a WebSocket message or file
   * system watch event), the callback is invoked with the updated map.
   *
   * This method is optional — providers that do not support live updates
   * may omit it.
   *
   * @param locale - BCP-47 locale code to watch
   * @param namespace - Namespace to watch
   * @param callback - Called whenever the translation map changes
   * @returns An {@link Unsubscribe} function that stops the subscription
   */
  onChange?(
    locale: Locale,
    namespace: string,
    callback: (map: TranslationMap) => void,
  ): Unsubscribe;
}
