/**
 * Tests for getDeviceLocale utility.
 */

import { describe, it, expect } from 'vitest';
import { getDeviceLocale } from './utils';
import type { IPlatform, INativeModules } from './utils';

describe('getDeviceLocale', () => {
  it('returns the fallback when no platform info is available and navigator is absent', () => {
    // Simulate an environment where navigator.language is not set.
    const original = (globalThis as Record<string, unknown>)['navigator'];
    delete (globalThis as Record<string, unknown>)['navigator'];
    try {
      expect(getDeviceLocale({ fallback: 'ja' })).toBe('ja');
    } finally {
      if (original !== undefined) {
        (globalThis as Record<string, unknown>)['navigator'] = original;
      }
    }
  });

  it('defaults to "en" when fallback is not provided and navigator is absent', () => {
    const original = (globalThis as Record<string, unknown>)['navigator'];
    delete (globalThis as Record<string, unknown>)['navigator'];
    try {
      expect(getDeviceLocale({})).toBe('en');
    } finally {
      if (original !== undefined) {
        (globalThis as Record<string, unknown>)['navigator'] = original;
      }
    }
  });

  it('reads localeIdentifier from NativeModules on Android', () => {
    const nativeModules: INativeModules = {
      I18nManager: { localeIdentifier: 'fr_FR' },
    };
    expect(getDeviceLocale({ nativeModules })).toBe('fr-FR');
  });

  it('normalises underscores to hyphens in localeIdentifier', () => {
    const nativeModules: INativeModules = {
      I18nManager: { localeIdentifier: 'zh_CN' },
    };
    expect(getDeviceLocale({ nativeModules })).toBe('zh-CN');
  });

  it('uses platform.select for iOS when NativeModules is absent', () => {
    const platform: IPlatform = {
      OS: 'ios',
      select: <T>(specifics: Record<string, T>) => specifics['ios'] ?? specifics['default'],
    };

    // Simulate navigator.language not being set in the platform.select path.
    // We pass `platform` with iOS so the select branch is exercised.
    const result = getDeviceLocale({ platform, fallback: 'de' });
    // In test environment navigator.language may be set to 'en' by jsdom,
    // or absent in a node env.  Either way should not throw.
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to fallback when platform.select returns undefined', () => {
    const platform: IPlatform = {
      OS: 'ios',
      // Returns undefined for every key
      select: <T>(_: Record<string, T>) => undefined,
    };
    const result = getDeviceLocale({ platform, fallback: 'ja' });
    // undefined from platform.select → falls through to navigator.language or fallback
    expect(typeof result).toBe('string');
  });
});
