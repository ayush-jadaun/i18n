/**
 * @i18n-platform/sdk-react
 *
 * React/Next.js SDK for the i18n automation platform.
 *
 * Provides a context provider, hooks, and utility components that wrap
 * `@i18n-platform/sdk-js` for use in React applications.
 *
 * @example
 * ```tsx
 * import { I18nProvider, useTranslation } from '@i18n-platform/sdk-react';
 *
 * function App() {
 *   return (
 *     <I18nProvider
 *       config={{
 *         projectId: 'my-app',
 *         defaultLocale: 'en',
 *         delivery: 'bundled',
 *         translations: { en: { greeting: 'Hello, {name}!' } },
 *       }}
 *     >
 *       <Greeting />
 *     </I18nProvider>
 *   );
 * }
 *
 * function Greeting() {
 *   const { t } = useTranslation();
 *   return <p>{t('greeting', { name: 'Alice' })}</p>;
 * }
 * ```
 *
 * @packageDocumentation
 */

// ── Context ────────────────────────────────────────────────────────────────
export { I18nContext } from './context';

// ── Provider ───────────────────────────────────────────────────────────────
export { I18nProvider } from './provider';
export type { I18nProviderProps } from './provider';

// ── Hooks ──────────────────────────────────────────────────────────────────
export { useTranslation } from './hooks';
export type { UseTranslationResult } from './hooks';

// ── Components ─────────────────────────────────────────────────────────────
export { Trans, LocaleSwitcher } from './components';
export type { TransProps, LocaleSwitcherProps } from './components';

// ── Re-export core SDK types for convenience ───────────────────────────────
export type { I18nConfig, I18nInstance } from '@i18n-platform/sdk-js';
