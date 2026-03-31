/**
 * @i18n-platform/sdk-js
 *
 * Framework-agnostic JavaScript SDK for the i18n automation platform.
 *
 * All framework-specific SDKs (React, Node.js, React Native) build on top of
 * the primitives exported from this package.
 *
 * @example
 * ```ts
 * import { createI18n } from '@i18n-platform/sdk-js';
 *
 * const i18n = createI18n({
 *   projectId: 'my-project',
 *   defaultLocale: 'en',
 *   delivery: 'bundled',
 *   translations: {
 *     en: { 'greeting': 'Hello, {name}!' },
 *   },
 * });
 *
 * await i18n.setLocale('en');
 * console.log(i18n.t('greeting', { name: 'World' })); // "Hello, World!"
 * ```
 *
 * @packageDocumentation
 */

// ── Factory ────────────────────────────────────────────────────────────────
export { createI18n } from './i18n';

// ── Translation engine ─────────────────────────────────────────────────────
export { Translator } from './translator';

// ── Providers ──────────────────────────────────────────────────────────────
export { ApiProvider } from './providers/api.provider';
export { CdnProvider } from './providers/cdn.provider';
export { BundledProvider } from './providers/bundled.provider';

// ── Types ──────────────────────────────────────────────────────────────────
export type { I18nConfig, I18nInstance } from './types';
