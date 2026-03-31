/**
 * SDK-specific types for @i18n-platform/sdk-js.
 *
 * @module types
 */

import type { Locale, TranslationMap, DeliveryMode } from '@i18n-platform/core';

/**
 * Configuration object passed to {@link createI18n}.
 */
export interface I18nConfig {
  /** The project identifier on the i18n platform. */
  projectId: string;

  /** The locale used when no other locale is active. */
  defaultLocale: Locale;

  /**
   * All locales the application supports.
   * Used to validate calls to {@link I18nInstance.setLocale}.
   */
  supportedLocales?: Locale[];

  /** How translation data is loaded at runtime. */
  delivery: DeliveryMode;

  /**
   * Base URL of the platform API.
   * Required when {@link delivery} is `"api"`.
   * @example "https://api.i18n-platform.com"
   */
  apiUrl?: string;

  /**
   * Bearer token for the platform API.
   * Required when {@link delivery} is `"api"`.
   */
  apiKey?: string;

  /**
   * Base URL of the CDN serving translation bundles.
   * Required when {@link delivery} is `"cdn"`.
   * @example "https://cdn.i18n-platform.com"
   */
  cdnUrl?: string;

  /**
   * Pre-bundled translation maps keyed by locale.
   * Required when {@link delivery} is `"bundled"`.
   * @example \{ "en": \{ "hello": "Hello" \}, "fr": \{ "hello": "Bonjour" \} \}
   */
  translations?: Record<Locale, TranslationMap>;

  /**
   * Translation namespaces to load.
   * When omitted the provider loads the default (root) namespace.
   */
  namespaces?: string[];

  /**
   * Locale to fall back to when a key is missing in the active locale.
   * Defaults to {@link defaultLocale}.
   */
  fallbackLocale?: Locale;

  /**
   * When `true`, missing keys and lifecycle events are logged to the console.
   * @default false
   */
  debug?: boolean;
}

/**
 * The public interface returned by {@link createI18n}.
 */
export interface I18nInstance {
  /**
   * Translates a key using the currently active locale.
   *
   * @param key - The translation key (e.g. `"auth.login.title"`)
   * @param params - Optional interpolation parameters
   * @returns The translated string, or `key` if the key is not found
   *
   * @example
   * ```ts
   * i18n.t('greeting', { name: 'Alice' }); // "Hello, Alice!"
   * i18n.t('items', { count: 2 });          // "2 items"
   * ```
   */
  t(key: string, params?: Record<string, string | number>): string;

  /** The currently active locale. */
  readonly locale: Locale;

  /**
   * Switches the active locale and loads its translations if not already cached.
   *
   * @param locale - The target locale to switch to
   * @throws {Error} If `locale` is not in {@link I18nConfig.supportedLocales} (when provided)
   */
  setLocale(locale: Locale): Promise<void>;

  /** `true` while translations are being fetched. */
  readonly isLoading: boolean;

  /**
   * Registers an event listener.
   *
   * @param event - `"localeChange"` fires after the active locale is switched;
   *   `"loaded"` fires after translations for a locale finish loading
   * @param callback - Invoked with the relevant locale
   * @returns A function that removes the listener when called
   */
  on(event: 'localeChange', callback: (locale: Locale) => void): () => void;
  on(event: 'loaded', callback: (locale: Locale) => void): () => void;

  /**
   * Returns the in-memory translation map for a locale.
   *
   * @param locale - The locale to retrieve; defaults to the active locale
   * @returns A flat key→value map, or an empty object if the locale is not loaded
   */
  getTranslations(locale?: Locale): TranslationMap;

  /**
   * Pre-fetches and caches translations for one or more locales.
   *
   * @param locales - Locales to warm up
   */
  preload(locales: Locale[]): Promise<void>;
}
