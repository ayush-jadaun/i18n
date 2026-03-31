import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createI18n } from './i18n';
import type { I18nConfig } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bundledConfig(overrides: Partial<I18nConfig> = {}): I18nConfig {
  return {
    projectId: 'test-project',
    defaultLocale: 'en',
    delivery: 'bundled',
    translations: {
      en: {
        hello: 'Hello',
        greeting: 'Hello, {name}!',
        items: '{count, plural, one {# item} other {# items}}',
      },
      fr: {
        hello: 'Bonjour',
        greeting: 'Bonjour, {name}!',
      },
    },
    supportedLocales: ['en', 'fr'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createI18n', () => {
  // ── initial state ────────────────────────────────────────────────────

  it('returns an instance with the correct initial locale', () => {
    const i18n = createI18n(bundledConfig());
    expect(i18n.locale).toBe('en');
  });

  it('translates a key in the default locale', async () => {
    const i18n = createI18n(bundledConfig());
    await i18n.setLocale('en');
    expect(i18n.t('hello')).toBe('Hello');
  });

  it('returns the key when it is missing', async () => {
    const i18n = createI18n(bundledConfig());
    await i18n.setLocale('en');
    expect(i18n.t('no.such.key')).toBe('no.such.key');
  });

  // ── t() with params ──────────────────────────────────────────────────

  it('interpolates params in t()', async () => {
    const i18n = createI18n(bundledConfig());
    await i18n.setLocale('en');
    expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
  });

  it('handles plural form via t()', async () => {
    const i18n = createI18n(bundledConfig());
    await i18n.setLocale('en');
    expect(i18n.t('items', { count: 1 })).toBe('1 item');
    expect(i18n.t('items', { count: 5 })).toBe('5 items');
  });

  // ── setLocale ────────────────────────────────────────────────────────

  it('switches locale and translates in new locale', async () => {
    const i18n = createI18n(bundledConfig());
    await i18n.setLocale('fr');
    expect(i18n.locale).toBe('fr');
    expect(i18n.t('hello')).toBe('Bonjour');
  });

  it('throws when switching to an unsupported locale', async () => {
    const i18n = createI18n(bundledConfig());
    await expect(i18n.setLocale('de')).rejects.toThrow(/supportedLocales/);
  });

  it('does not throw when supportedLocales is not configured', async () => {
    const cfg = bundledConfig({ supportedLocales: undefined });
    const i18n = createI18n(cfg);
    await expect(i18n.setLocale('de')).resolves.not.toThrow();
  });

  // ── isLoading ────────────────────────────────────────────────────────

  it('isLoading is false after awaiting setLocale', async () => {
    const i18n = createI18n(bundledConfig());
    await i18n.setLocale('en');
    expect(i18n.isLoading).toBe(false);
  });

  // ── events ───────────────────────────────────────────────────────────

  it('fires localeChange event after setLocale', async () => {
    const i18n = createI18n(bundledConfig());
    const spy = vi.fn();
    i18n.on('localeChange', spy);
    await i18n.setLocale('fr');
    expect(spy).toHaveBeenCalledWith('fr');
  });

  it('fires loaded event after translations are fetched', async () => {
    const i18n = createI18n(bundledConfig());
    const spy = vi.fn();
    i18n.on('loaded', spy);
    await i18n.setLocale('fr');
    expect(spy).toHaveBeenCalledWith('fr');
  });

  it('does not fire loaded a second time for a cached locale', async () => {
    const i18n = createI18n(bundledConfig());
    const spy = vi.fn();
    i18n.on('loaded', spy);
    await i18n.setLocale('fr');
    await i18n.setLocale('en');
    await i18n.setLocale('fr'); // fr is already cached
    expect(spy).toHaveBeenCalledTimes(1); // only once for 'fr'
  });

  it('unsubscribes listener when returned function is called', async () => {
    const i18n = createI18n(bundledConfig());
    const spy = vi.fn();
    const off = i18n.on('localeChange', spy);
    off();
    await i18n.setLocale('fr');
    expect(spy).not.toHaveBeenCalled();
  });

  // ── getTranslations ──────────────────────────────────────────────────

  it('getTranslations returns the map for the current locale', async () => {
    const i18n = createI18n(bundledConfig());
    await i18n.setLocale('en');
    expect(i18n.getTranslations()).toMatchObject({ hello: 'Hello' });
  });

  it('getTranslations accepts an explicit locale argument', async () => {
    const i18n = createI18n(bundledConfig());
    await i18n.preload(['en', 'fr']);
    expect(i18n.getTranslations('fr')).toMatchObject({ hello: 'Bonjour' });
  });

  // ── preload ──────────────────────────────────────────────────────────

  it('preload fetches all requested locales', async () => {
    const i18n = createI18n(bundledConfig());
    await i18n.preload(['en', 'fr']);
    expect(i18n.getTranslations('en')).toMatchObject({ hello: 'Hello' });
    expect(i18n.getTranslations('fr')).toMatchObject({ hello: 'Bonjour' });
  });

  // ── fallback locale ──────────────────────────────────────────────────

  it('uses fallbackLocale when a key is missing in the active locale', async () => {
    // 'items' is only in 'en', not in 'fr'
    const i18n = createI18n(bundledConfig({ fallbackLocale: 'en' }));
    await i18n.setLocale('fr');
    expect(i18n.t('items', { count: 2 })).toBe('2 items');
  });

  // ── createProvider errors ────────────────────────────────────────────

  it('throws when delivery is "api" and apiUrl is missing', () => {
    expect(() =>
      createI18n({ projectId: 'x', defaultLocale: 'en', delivery: 'api', apiKey: 'k' }),
    ).toThrow(/apiUrl/);
  });

  it('throws when delivery is "api" and apiKey is missing', () => {
    expect(() =>
      createI18n({ projectId: 'x', defaultLocale: 'en', delivery: 'api', apiUrl: 'http://api' }),
    ).toThrow(/apiKey/);
  });

  it('throws when delivery is "cdn" and cdnUrl is missing', () => {
    expect(() =>
      createI18n({ projectId: 'x', defaultLocale: 'en', delivery: 'cdn' }),
    ).toThrow(/cdnUrl/);
  });
});
