/**
 * Server-side i18n factory.
 *
 * Wraps `createI18n` from `@i18n-platform/sdk-js` and adds a locale-aware
 * `translate()` method suitable for per-request use in Express / Fastify
 * / any Node.js HTTP server.
 *
 * @module server-i18n
 */

import { createI18n } from '@i18n-platform/sdk-js';
import type { I18nConfig } from '@i18n-platform/sdk-js';
import type { I18nServerInstance } from './types';

/**
 * Creates a server-optimised {@link I18nServerInstance}.
 *
 * Differences from the browser `createI18n`:
 * - Calls `preload()` on all `supportedLocales` immediately so every locale
 *   is warm before the first request arrives.
 * - Exposes `translate(locale, key, params)` for per-request, stateless
 *   translation without mutating the shared active locale.
 *
 * @param config - SDK configuration (same shape as the JS SDK)
 * @returns A promise that resolves to a ready {@link I18nServerInstance}
 *
 * @example
 * ```ts
 * const i18n = await createI18nServer({
 *   projectId: 'my-api',
 *   defaultLocale: 'en',
 *   supportedLocales: ['en', 'fr', 'de'],
 *   delivery: 'bundled',
 *   translations: { en: { hello: 'Hello' }, fr: { hello: 'Bonjour' }, de: { hello: 'Hallo' } },
 * });
 *
 * app.use(i18nMiddleware(i18n));
 * ```
 */
export async function createI18nServer(
  config: I18nConfig,
): Promise<I18nServerInstance> {
  const base = createI18n(config);

  // Pre-load all supported locales so every locale is cache-warm before
  // the first request is handled.
  const localesToPreload = config.supportedLocales ?? [config.defaultLocale];
  await base.preload(localesToPreload);

  const instance: I18nServerInstance = {
    ...base,

    translate(
      locale: string,
      key: string,
      params?: Record<string, string | number>,
    ): string {
      // Temporarily query the translator through getTranslations.
      // We build a stateless lookup by fetching the locale's map directly,
      // falling back through the default locale and finally to the key itself.
      const map = base.getTranslations(locale);
      const fallbackMap = base.getTranslations(config.defaultLocale);

      const template = map[key] ?? fallbackMap[key];
      if (template === undefined) return key;

      // Delegate interpolation to the base instance's t() by setting locale
      // temporarily is not safe for concurrent requests, so we perform a
      // simple parameter substitution here instead.
      return substituteParams(template, params);
    },
  };

  return instance;
}

/**
 * Performs basic `{param}` substitution on a template string.
 *
 * This is intentionally a lightweight fallback used by `translate()` so that
 * the server method never mutates shared locale state.  ICU plural expressions
 * are not expanded here — use the full `t()` API on the base instance when
 * plurals are needed.
 *
 * @param template - The raw translation string, e.g. `"Hello, {name}!"`
 * @param params - Key/value pairs to substitute
 * @returns The string with `{key}` tokens replaced
 * @internal
 */
function substituteParams(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
}
