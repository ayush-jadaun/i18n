/**
 * i18n configuration for the Next.js App Router example.
 *
 * Uses the `"bundled"` delivery mode so all translations are compiled into
 * the client bundle — no network requests are made at runtime.  This is the
 * recommended approach for most Next.js apps that have a small-to-medium
 * translation corpus.
 *
 * @module i18n/config
 */

import type { I18nConfig } from '@i18n-platform/sdk-react';

import en from './translations/en.json';
import fr from './translations/fr.json';
import de from './translations/de.json';

/** The list of locales supported by this application. */
export const SUPPORTED_LOCALES = ['en', 'fr', 'de'] as const;

/** Type-safe union of supported locale codes. */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Shared {@link I18nConfig} passed to `<I18nProvider>` in the root layout.
 *
 * All three locale bundles are included here; `sdk-react` will only activate
 * the selected locale at runtime.
 */
export const i18nConfig: I18nConfig = {
  projectId: 'example-nextjs-app-router',
  defaultLocale: 'en',
  supportedLocales: [...SUPPORTED_LOCALES],
  delivery: 'bundled',
  translations: { en, fr, de },
};
