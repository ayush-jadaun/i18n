/**
 * React Native I18nProvider — thin wrapper around the React SDK provider.
 *
 * Re-exports {@link I18nProvider} from `@i18n-platform/sdk-react` so
 * React Native consumers get the same API as web consumers.  The
 * provider is intentionally identical; platform-specific behaviour
 * (e.g. caching with AsyncStorage) is handled outside the render tree
 * via {@link AsyncStorageCacheAdapter}.
 *
 * @module provider
 */

export { I18nProvider } from './re-exports';
export type { I18nProviderProps } from './re-exports';
