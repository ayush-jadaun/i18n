/**
 * React Native utility helpers for device locale detection.
 *
 * All React Native APIs are accessed via the injected `platform` argument so
 * this module can be tested in a plain Node.js / Vitest environment without
 * the full React Native runtime.
 *
 * @module utils
 */

/**
 * Minimal interface that mirrors the subset of `react-native`'s `Platform`
 * module used for locale detection.
 */
export interface IPlatform {
  /** The operating system: `"ios"`, `"android"`, `"windows"`, `"macos"`, or `"web"`. */
  OS: 'ios' | 'android' | 'windows' | 'macos' | 'web' | string;
  /**
   * Returns a value specific to the current platform.
   *
   * @param specifics - A map of platform keys to values, with `"default"` as fallback.
   */
  select: <T>(specifics: Partial<Record<string, T>> & { default?: T }) => T | undefined;
}

/**
 * Minimal interface that mirrors the subset of `react-native`'s `NativeModules`
 * used for locale retrieval on Android.
 */
export interface INativeModules {
  /** The i18nManager NativeModule, available on Android. */
  I18nManager?: {
    /** The device's current locale string, e.g. `"en-US"`. */
    localeIdentifier?: string;
  };
}

/**
 * Options for {@link getDeviceLocale}.
 */
export interface GetDeviceLocaleOptions {
  /** Fallback locale when native locale retrieval fails. Defaults to `"en"`. */
  fallback?: string;
  /**
   * A `Platform`-compatible object injected for testability.
   * When omitted the function falls back to `navigator.language` if available.
   */
  platform?: IPlatform;
  /**
   * A `NativeModules`-compatible object injected for testability.
   * Used on Android to read `I18nManager.localeIdentifier`.
   */
  nativeModules?: INativeModules;
}

/**
 * Detects the device's current locale.
 *
 * Resolution order:
 * 1. `NativeModules.I18nManager.localeIdentifier` (Android).
 * 2. `Platform.select({ ios: … })` with a global `navigator.language` polyfill.
 * 3. `navigator.language` (web / Expo web).
 * 4. The `fallback` value (default: `"en"`).
 *
 * All React Native dependencies are injected via `options`, so the function
 * is fully testable in Node.js without the RN runtime.
 *
 * @param options - Optional overrides for platform, nativeModules, and fallback
 * @returns A BCP-47 locale tag, e.g. `"en-US"`, `"fr"`, `"zh-CN"`
 *
 * @example
 * ```ts
 * import { Platform, NativeModules } from 'react-native';
 * import { getDeviceLocale } from '@i18n-platform/sdk-react-native';
 *
 * const locale = getDeviceLocale({ platform: Platform, nativeModules: NativeModules });
 * ```
 */
export function getDeviceLocale(options: GetDeviceLocaleOptions = {}): string {
  const { fallback = 'en', platform, nativeModules } = options;

  // Android: NativeModules.I18nManager.localeIdentifier
  if (nativeModules?.I18nManager?.localeIdentifier) {
    return normaliseLocale(nativeModules.I18nManager.localeIdentifier);
  }

  // iOS / web: Platform.select
  if (platform) {
    const locale = platform.select<string>({
      ios: getNavigatorLanguage(),
      android: nativeModules?.I18nManager?.localeIdentifier ?? getNavigatorLanguage(),
      default: getNavigatorLanguage(),
    });
    if (locale) return normaliseLocale(locale);
  }

  // Web / Expo web: navigator.language
  const navLocale = getNavigatorLanguage();
  if (navLocale) return normaliseLocale(navLocale);

  return fallback;
}

/**
 * Reads `navigator.language` when the global is available (web / Expo web).
 *
 * @returns The language string, or `undefined` when not available
 * @internal
 */
function getNavigatorLanguage(): string | undefined {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language;
  }
  return undefined;
}

/**
 * Normalises a locale string by converting underscores to hyphens.
 *
 * React Native's `localeIdentifier` uses underscores (`en_US`) whereas
 * BCP-47 uses hyphens (`en-US`).
 *
 * @param locale - The raw locale string from the native layer
 * @returns A BCP-47 compliant locale tag
 * @internal
 */
function normaliseLocale(locale: string): string {
  return locale.replace(/_/g, '-');
}
