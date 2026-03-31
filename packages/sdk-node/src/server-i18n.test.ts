/**
 * Tests for createI18nServer factory.
 */

import { describe, it, expect } from 'vitest';
import { createI18nServer } from './server-i18n';
import type { I18nConfig } from '@i18n-platform/sdk-js';

const config: I18nConfig = {
  projectId: 'test',
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr', 'de'],
  delivery: 'bundled',
  translations: {
    en: { hello: 'Hello', greeting: 'Hello, {name}!' },
    fr: { hello: 'Bonjour', greeting: 'Bonjour, {name}!' },
    de: { hello: 'Hallo' },
  },
};

describe('createI18nServer', () => {
  it('returns an I18nServerInstance with a translate() method', async () => {
    const i18n = await createI18nServer(config);
    expect(typeof i18n.translate).toBe('function');
  });

  it('translates a key for a specific locale without changing active locale', async () => {
    const i18n = await createI18nServer(config);

    const en = i18n.translate('en', 'hello');
    const fr = i18n.translate('fr', 'hello');

    expect(en).toBe('Hello');
    expect(fr).toBe('Bonjour');
    // Active locale remains unchanged (default is 'en')
    expect(i18n.locale).toBe('en');
  });

  it('interpolates parameters', async () => {
    const i18n = await createI18nServer(config);
    const result = i18n.translate('fr', 'greeting', { name: 'Alice' });
    expect(result).toBe('Bonjour, Alice!');
  });

  it('falls back to defaultLocale when the key is missing in the target locale', async () => {
    const i18n = await createI18nServer(config);
    // 'de' does not have 'greeting' — should fall back to 'en'
    const result = i18n.translate('de', 'greeting', { name: 'Bob' });
    expect(result).toBe('Hello, Bob!');
  });

  it('returns the key itself when missing in all locales', async () => {
    const i18n = await createI18nServer(config);
    expect(i18n.translate('en', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('pre-loads all supported locales (getTranslations is populated)', async () => {
    const i18n = await createI18nServer(config);
    // All three locales should be available immediately
    expect(Object.keys(i18n.getTranslations('en')).length).toBeGreaterThan(0);
    expect(Object.keys(i18n.getTranslations('fr')).length).toBeGreaterThan(0);
    expect(Object.keys(i18n.getTranslations('de')).length).toBeGreaterThan(0);
  });
});
