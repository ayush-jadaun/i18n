/**
 * i18n configuration for the React Vite SPA example.
 *
 * Both locale bundles are imported statically so Vite can include them in the
 * production bundle.  The `"bundled"` delivery mode is used — no CDN or API
 * calls are made at runtime.
 *
 * @module i18n/config
 */

import type { I18nConfig } from '@i18n-platform/sdk-react';

import en from './en.json';
import fr from './fr.json';

/** The list of locales supported by this SPA. */
export const SUPPORTED_LOCALES = ['en', 'fr'] as const;

/** Type-safe union of supported locale codes. */
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Shared {@link I18nConfig} passed to `<I18nProvider>` in the root `<App>`.
 */
export const i18nConfig: I18nConfig = {
  projectId: 'example-react-vite-spa',
  defaultLocale: 'en',
  supportedLocales: [...SUPPORTED_LOCALES],
  delivery: 'bundled',
  translations: { en, fr },
};
