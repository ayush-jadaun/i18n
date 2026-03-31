/**
 * @i18n-platform/sdk-react-native
 *
 * React Native SDK for the i18n automation platform.
 *
 * Provides the same React hooks and components as `@i18n-platform/sdk-react`
 * plus React Native-specific utilities:
 * - {@link AsyncStorageCacheAdapter} — offline translation cache via AsyncStorage
 * - {@link getDeviceLocale} — device locale detection without direct RN imports
 *
 * @example
 * ```tsx
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * import {
 *   I18nProvider,
 *   useTranslation,
 *   AsyncStorageCacheAdapter,
 *   getDeviceLocale,
 * } from '@i18n-platform/sdk-react-native';
 *
 * const cache = new AsyncStorageCacheAdapter(AsyncStorage);
 * const deviceLocale = getDeviceLocale({ platform: Platform, nativeModules: NativeModules });
 *
 * function App() {
 *   return (
 *     <I18nProvider
 *       config={{ projectId: 'my-app', defaultLocale: 'en', delivery: 'bundled', translations: { en: { hi: 'Hi' } } }}
 *       initialLocale={deviceLocale}
 *     >
 *       <Screen />
 *     </I18nProvider>
 *   );
 * }
 * ```
 *
 * @packageDocumentation
 */

// ── Provider & context (re-exported from sdk-react) ───────────────────────
export { I18nProvider, I18nContext } from './re-exports';
export type { I18nProviderProps } from './re-exports';

// ── Hooks (re-exported from sdk-react) ────────────────────────────────────
export { useTranslation } from './hooks';
export type { UseTranslationResult } from './hooks';

// ── Components (re-exported from sdk-react) ───────────────────────────────
export { Trans, LocaleSwitcher } from './re-exports';
export type { TransProps, LocaleSwitcherProps } from './re-exports';

// ── RN-specific: offline storage adapter ──────────────────────────────────
export { AsyncStorageCacheAdapter } from './storage';
export type { IAsyncStorage, TranslationMap } from './storage';

// ── RN-specific: device locale detection ──────────────────────────────────
export { getDeviceLocale } from './utils';
export type {
  GetDeviceLocaleOptions,
  IPlatform,
  INativeModules,
} from './utils';

// ── Re-export core SDK types for convenience ───────────────────────────────
export type { I18nConfig, I18nInstance } from '@i18n-platform/sdk-js';
