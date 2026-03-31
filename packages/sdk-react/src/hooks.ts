/**
 * React hooks for accessing i18n functionality.
 *
 * @module hooks
 */

import { useContext } from 'react';
import { I18nContext } from './context';

/**
 * The object returned by {@link useTranslation}.
 */
export interface UseTranslationResult {
  /**
   * Translates a key, optionally scoped to the namespace provided to
   * {@link useTranslation}.
   *
   * @param key - Translation key, relative to the namespace when one is set
   * @param params - Optional interpolation parameters
   * @returns The translated string, or the full key if not found
   *
   * @example
   * ```tsx
   * const { t } = useTranslation('auth');
   * t('login.title'); // looks up "auth.login.title"
   * ```
   */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** The currently active locale code. */
  locale: string;
  /**
   * Switches the active locale.  Triggers a re-render once the locale is
   * fully loaded.
   */
  setLocale: (locale: string) => Promise<void>;
  /** `true` while translations are being fetched from the provider. */
  isLoading: boolean;
}

/**
 * Accesses the nearest {@link I18nProvider}'s i18n instance and returns
 * translation helpers.
 *
 * Must be called inside a component tree that is wrapped by
 * {@link I18nProvider}.
 *
 * @param namespace - Optional namespace prefix.  When provided, all keys
 *   passed to `t()` are automatically prefixed with `"<namespace>."`.
 * @returns Translation helpers and locale state
 *
 * @throws {Error} When called outside of an {@link I18nProvider}
 *
 * @example
 * ```tsx
 * function Greeting() {
 *   const { t, locale } = useTranslation('home');
 *   return <h1>{t('greeting')}</h1>; // looks up "home.greeting"
 * }
 * ```
 */
export function useTranslation(namespace?: string): UseTranslationResult {
  const ctx = useContext(I18nContext);

  if (ctx === null) {
    throw new Error(
      'useTranslation must be used within an <I18nProvider>. ' +
        'Ensure your component tree is wrapped with <I18nProvider>.',
    );
  }

  const { i18n } = ctx;

  return {
    t(key: string, params?: Record<string, string | number>): string {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return i18n.t(fullKey, params);
    },
    locale: i18n.locale,
    setLocale: i18n.setLocale.bind(i18n),
    isLoading: i18n.isLoading,
  };
}
