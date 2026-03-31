/**
 * Tests for Express / Fastify middleware and locale detection.
 */

import { describe, it, expect, vi } from 'vitest';
import { detectLocale, i18nMiddleware, fastifyI18nPlugin } from './middleware';
import { createI18nServer } from './server-i18n';
import type { I18nConfig } from '@i18n-platform/sdk-js';

const config: I18nConfig = {
  projectId: 'test',
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr', 'de'],
  delivery: 'bundled',
  translations: {
    en: { hello: 'Hello', 'greeting': 'Hello, {name}!' },
    fr: { hello: 'Bonjour', 'greeting': 'Bonjour, {name}!' },
    de: { hello: 'Hallo', 'greeting': 'Hallo, {name}!' },
  },
};

// ---------------------------------------------------------------------------
// detectLocale
// ---------------------------------------------------------------------------

describe('detectLocale', () => {
  it('returns the fallback when Accept-Language is absent', () => {
    expect(detectLocale({ headers: {} })).toBe('en');
  });

  it('returns the single locale when only one is present', () => {
    expect(detectLocale({ headers: { 'accept-language': 'fr' } })).toBe('fr');
  });

  it('picks the locale with the highest q-value', () => {
    expect(
      detectLocale({ headers: { 'accept-language': 'en;q=0.7,fr;q=0.9,de;q=0.5' } }),
    ).toBe('fr');
  });

  it('treats a locale without q= as q=1.0 (highest priority)', () => {
    expect(
      detectLocale({ headers: { 'accept-language': 'de,en;q=0.8,fr;q=0.5' } }),
    ).toBe('de');
  });

  it('handles a locale with region subtag', () => {
    expect(
      detectLocale({ headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' } }),
    ).toBe('fr-FR');
  });

  it('uses the custom fallback when the header is missing', () => {
    expect(detectLocale({ headers: {} }, 'de')).toBe('de');
  });
});

// ---------------------------------------------------------------------------
// i18nMiddleware (Express)
// ---------------------------------------------------------------------------

describe('i18nMiddleware', () => {
  async function setup() {
    const i18n = await createI18nServer(config);
    return i18n;
  }

  it('attaches req.locale and req.t to the request', async () => {
    const i18n = await setup();
    const middleware = i18nMiddleware(i18n);

    const req = { headers: { 'accept-language': 'fr' } } as Record<string, unknown> & { headers: Record<string, string> };
    const res = {};
    const next = vi.fn();

    middleware(req as Parameters<typeof middleware>[0], res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req['locale']).toBe('fr');
    expect(typeof req['t']).toBe('function');
  });

  it('translates keys in the detected locale', async () => {
    const i18n = await setup();
    const middleware = i18nMiddleware(i18n);

    const req = { headers: { 'accept-language': 'fr' } } as Record<string, unknown> & { headers: Record<string, string> };
    const res = {};
    const next = vi.fn();

    middleware(req as Parameters<typeof middleware>[0], res, next);

    const t = req['t'] as (key: string) => string;
    expect(t('hello')).toBe('Bonjour');
  });

  it('uses the fallback locale when Accept-Language is absent', async () => {
    const i18n = await setup();
    const middleware = i18nMiddleware(i18n, 'de');

    const req = { headers: {} } as Record<string, unknown> & { headers: Record<string, string> };
    const res = {};
    const next = vi.fn();

    middleware(req as Parameters<typeof middleware>[0], res, next);

    expect(req['locale']).toBe('de');
    const t = req['t'] as (key: string) => string;
    expect(t('hello')).toBe('Hallo');
  });

  it('interpolates parameters in the translated string', async () => {
    const i18n = await setup();
    const middleware = i18nMiddleware(i18n);

    const req = { headers: { 'accept-language': 'fr' } } as Record<string, unknown> & { headers: Record<string, string> };
    middleware(req as Parameters<typeof middleware>[0], {}, vi.fn());

    const t = req['t'] as (key: string, params?: Record<string, string | number>) => string;
    expect(t('greeting', { name: 'Alice' })).toBe('Bonjour, Alice!');
  });
});

// ---------------------------------------------------------------------------
// fastifyI18nPlugin
// ---------------------------------------------------------------------------

describe('fastifyI18nPlugin', () => {
  it('attaches request.locale and request.t', async () => {
    const i18n = await createI18nServer(config);
    const hook = fastifyI18nPlugin(i18n);

    const request = { headers: { 'accept-language': 'de' } } as Record<string, unknown> & { headers: Record<string, string> };
    await hook(request as Parameters<typeof hook>[0], {});

    expect(request['locale']).toBe('de');
    const t = request['t'] as (key: string) => string;
    expect(t('hello')).toBe('Hallo');
  });

  it('uses the custom fallback when the header is absent', async () => {
    const i18n = await createI18nServer(config);
    const hook = fastifyI18nPlugin(i18n, 'fr');

    const request = { headers: {} } as Record<string, unknown> & { headers: Record<string, string> };
    await hook(request as Parameters<typeof hook>[0], {});

    expect(request['locale']).toBe('fr');
  });
});
