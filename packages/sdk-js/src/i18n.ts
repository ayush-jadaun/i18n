/**
 * Main i18n factory — creates a fully configured {@link I18nInstance}.
 *
 * @module i18n
 */

import type { ITranslationProvider } from '@i18n-platform/core';
import type { Locale } from '@i18n-platform/core';
import { Translator } from './translator';
import { ApiProvider } from './providers/api.provider';
import { CdnProvider } from './providers/cdn.provider';
import { BundledProvider } from './providers/bundled.provider';
import type { I18nConfig, I18nInstance } from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Supported event names. */
type EventName = 'localeChange' | 'loaded';

/**
 * Instantiates the correct {@link ITranslationProvider} based on the delivery
 * mode declared in `config`.
 *
 * @param config - The user-supplied configuration object
 * @returns A concrete provider instance
 * @throws {Error} When required config fields are missing for the chosen delivery mode
 * @internal
 */
function createProvider(config: I18nConfig): ITranslationProvider {
  switch (config.delivery) {
    case 'api': {
      if (!config.apiUrl || !config.apiKey) {
        throw new Error(
          'delivery "api" requires both apiUrl and apiKey in the config',
        );
      }
      return new ApiProvider(config.apiUrl, config.apiKey, config.projectId);
    }
    case 'cdn': {
      if (!config.cdnUrl) {
        throw new Error('delivery "cdn" requires cdnUrl in the config');
      }
      return new CdnProvider(config.cdnUrl, config.projectId);
    }
    case 'bundled': {
      return new BundledProvider(config.translations ?? {});
    }
    default: {
      // Exhaustiveness check — TypeScript will catch unknown delivery values
      // at compile time, but we guard at runtime too.
      const _exhaustive: never = config.delivery;
      throw new Error(`Unknown delivery mode: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Loads translations for `locale` (all configured namespaces) via `provider`
 * and stores them in `translator`.
 *
 * @param translator - The `Translator` instance to populate
 * @param provider - The active translation provider
 * @param locale - Locale to load
 * @param namespaces - Namespaces to load; a single unnamed load is performed when empty
 * @param debug - Whether to log progress to the console
 * @internal
 */
async function loadLocale(
  translator: Translator,
  provider: ITranslationProvider,
  locale: Locale,
  namespaces: string[],
  debug: boolean,
): Promise<void> {
  if (namespaces.length === 0) {
    const map = await provider.load(locale, undefined as unknown as string);
    translator.mergeTranslations(locale, map);
    if (debug) {
      console.debug(`[i18n] loaded ${locale}`);
    }
    return;
  }

  await Promise.all(
    namespaces.map(async (ns) => {
      const map = await provider.load(locale, ns);
      translator.mergeTranslations(locale, map);
      if (debug) {
        console.debug(`[i18n] loaded ${locale}/${ns}`);
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Creates a fully configured, ready-to-use {@link I18nInstance}.
 *
 * The factory:
 * 1. Selects the appropriate provider based on `config.delivery`.
 * 2. Immediately starts loading translations for `config.defaultLocale`.
 * 3. Returns the instance synchronously — `isLoading` will be `true` until
 *    the initial load completes.
 *
 * @param config - SDK configuration
 * @returns A configured `I18nInstance`
 *
 * @example
 * ```ts
 * const i18n = createI18n({
 *   projectId: 'my-project',
 *   defaultLocale: 'en',
 *   delivery: 'bundled',
 *   translations: {
 *     en: { 'hello': 'Hello, {name}!' },
 *   },
 * });
 *
 * await i18n.setLocale('en');
 * i18n.t('hello', { name: 'Alice' }); // "Hello, Alice!"
 * ```
 */
export function createI18n(config: I18nConfig): I18nInstance {
  const translator = new Translator();
  const provider = createProvider(config);
  const namespaces = config.namespaces ?? [];
  const debug = config.debug ?? false;
  const fallbackLocale = config.fallbackLocale ?? config.defaultLocale;

  let currentLocale: Locale = config.defaultLocale;
  let loading = false;

  // Deduplicates concurrent loads for the same locale — maps locale → in-flight promise.
  const inFlight = new Map<Locale, Promise<void>>();

  // Event listeners: event name → set of callbacks
  const listeners = new Map<EventName, Set<(locale: Locale) => void>>();

  /** Fires all registered callbacks for an event. */
  function emit(event: EventName, locale: Locale): void {
    listeners.get(event)?.forEach((cb) => {
      try {
        cb(locale);
      } catch (err) {
        if (debug) {
          console.error(`[i18n] listener error on "${event}":`, err);
        }
      }
    });
  }

  /**
   * Fetches and caches translations for `locale`, deduplicating concurrent
   * requests.  Does NOT emit any events — callers are responsible for that.
   *
   * Returns a promise that resolves once the locale is fully loaded.
   * When the locale is already cached the promise resolves immediately.
   */
  function fetchLocale(locale: Locale): Promise<void> {
    // Already fully loaded — nothing to do.
    if (translator.hasLocale(locale)) return Promise.resolve();

    // Load already in progress — return the same promise so callers share it.
    const existing = inFlight.get(locale);
    if (existing) return existing;

    loading = true;
    const promise = loadLocale(translator, provider, locale, namespaces, debug)
      .then(() => {
        inFlight.delete(locale);
        loading = false;
      })
      .catch((err: unknown) => {
        inFlight.delete(locale);
        loading = false;
        throw err;
      });

    inFlight.set(locale, promise);
    return promise;
  }

  /**
   * Loads `locale` and emits the `'loaded'` event once the data is ready.
   * Deduplicates concurrent calls and skips already-loaded locales.
   */
  async function ensureLoaded(locale: Locale): Promise<void> {
    const wasLoaded = translator.hasLocale(locale);
    await fetchLocale(locale);
    if (!wasLoaded) {
      emit('loaded', locale);
    }
  }

  // Silently pre-warm the default locale — no events emitted.
  void fetchLocale(config.defaultLocale);

  // ---------------------------------------------------------------------------
  // I18nInstance implementation
  // ---------------------------------------------------------------------------

  return {
    t(key: string, params?: Record<string, string | number>): string {
      return translator.translate(currentLocale, key, params, fallbackLocale);
    },

    get locale(): Locale {
      return currentLocale;
    },

    async setLocale(locale: Locale): Promise<void> {
      const supported = config.supportedLocales;
      if (supported && !supported.includes(locale)) {
        throw new Error(
          `Locale "${locale}" is not in supportedLocales: ${supported.join(', ')}`,
        );
      }

      await ensureLoaded(locale);
      currentLocale = locale;
      emit('localeChange', locale);

      if (debug) {
        console.debug(`[i18n] locale changed to ${locale}`);
      }
    },

    get isLoading(): boolean {
      return loading;
    },

    on(
      event: EventName,
      callback: (locale: Locale) => void,
    ): () => void {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(callback);

      return () => {
        listeners.get(event)?.delete(callback);
      };
    },

    getTranslations(locale?: Locale): import('@i18n-platform/core').TranslationMap {
      return translator.getTranslations(locale ?? currentLocale);
    },

    async preload(locales: Locale[]): Promise<void> {
      await Promise.all(locales.map((l) => ensureLoaded(l)));
    },
  };
}
