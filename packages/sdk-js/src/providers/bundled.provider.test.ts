import { describe, it, expect } from 'vitest';
import { BundledProvider } from './bundled.provider';

const TRANSLATIONS = {
  en: { hello: 'Hello', goodbye: 'Goodbye' },
  fr: { hello: 'Bonjour', goodbye: 'Au revoir' },
  de: { hello: 'Hallo' },
};

describe('BundledProvider', () => {
  it('has providerId "bundled"', () => {
    const provider = new BundledProvider(TRANSLATIONS);
    expect(provider.providerId).toBe('bundled');
  });

  it('loads translations for an existing locale', async () => {
    const provider = new BundledProvider(TRANSLATIONS);
    const result = await provider.load('en');
    expect(result).toEqual({ hello: 'Hello', goodbye: 'Goodbye' });
  });

  it('loads translations for a different locale', async () => {
    const provider = new BundledProvider(TRANSLATIONS);
    const result = await provider.load('fr');
    expect(result).toEqual({ hello: 'Bonjour', goodbye: 'Au revoir' });
  });

  it('returns an empty object for an unknown locale', async () => {
    const provider = new BundledProvider(TRANSLATIONS);
    const result = await provider.load('ja');
    expect(result).toEqual({});
  });

  it('ignores the namespace argument (bundled translations are pre-merged)', async () => {
    const provider = new BundledProvider(TRANSLATIONS);
    const result = await provider.load('en', 'common' as string);
    expect(result).toEqual({ hello: 'Hello', goodbye: 'Goodbye' });
  });

  it('works with an empty translations object', async () => {
    const provider = new BundledProvider({});
    const result = await provider.load('en');
    expect(result).toEqual({});
  });

  it('works with a locale that has a partial map', async () => {
    const provider = new BundledProvider(TRANSLATIONS);
    const result = await provider.load('de');
    expect(result).toEqual({ hello: 'Hallo' });
  });
});
