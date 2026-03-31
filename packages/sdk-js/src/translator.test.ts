import { describe, it, expect, beforeEach } from 'vitest';
import { Translator } from './translator';

describe('Translator', () => {
  let translator: Translator;

  beforeEach(() => {
    translator = new Translator();
    translator.setTranslations('en', {
      hello: 'Hello',
      greeting: 'Hello, {name}!',
      farewell: 'Goodbye, {name}. See you in {days} days.',
      items: '{count, plural, one {# item} other {# items}}',
      messages: '{count, plural, zero {no messages} one {# message} other {# messages}}',
      status: 'You have {count, plural, one {# unread message} other {# unread messages}}.',
    });
    translator.setTranslations('fr', {
      hello: 'Bonjour',
      greeting: 'Bonjour, {name}!',
    });
  });

  // ── setTranslations / getTranslations ──────────────────────────────────

  it('stores and retrieves a translation map', () => {
    expect(translator.getTranslations('en')).toMatchObject({ hello: 'Hello' });
  });

  it('returns empty object for unknown locale', () => {
    expect(translator.getTranslations('xx')).toEqual({});
  });

  it('hasLocale returns true for loaded locale', () => {
    expect(translator.hasLocale('en')).toBe(true);
  });

  it('hasLocale returns false for unknown locale', () => {
    expect(translator.hasLocale('xx')).toBe(false);
  });

  // ── mergeTranslations ─────────────────────────────────────────────────

  it('mergeTranslations adds keys without removing existing ones', () => {
    translator.mergeTranslations('en', { extra: 'Extra key' });
    const map = translator.getTranslations('en');
    expect(map['hello']).toBe('Hello');
    expect(map['extra']).toBe('Extra key');
  });

  it('mergeTranslations creates a new locale if it does not exist', () => {
    translator.mergeTranslations('de', { hello: 'Hallo' });
    expect(translator.getTranslations('de')).toEqual({ hello: 'Hallo' });
  });

  // ── translate — basic ─────────────────────────────────────────────────

  it('translates a key without params', () => {
    expect(translator.translate('en', 'hello')).toBe('Hello');
  });

  it('returns the key itself when the locale is not loaded', () => {
    expect(translator.translate('xx', 'hello')).toBe('hello');
  });

  it('returns the key itself when the key is missing in the locale', () => {
    expect(translator.translate('en', 'missing.key')).toBe('missing.key');
  });

  // ── translate — fallback locale ───────────────────────────────────────

  it('falls back to fallbackLocale when key is missing in active locale', () => {
    // 'farewell' is only in 'en'
    expect(translator.translate('fr', 'farewell', { name: 'Alice', days: 3 }, 'en'))
      .toBe('Goodbye, Alice. See you in 3 days.');
  });

  it('does not fall back when fallbackLocale equals active locale', () => {
    expect(translator.translate('xx', 'hello', undefined, 'xx')).toBe('hello');
  });

  // ── interpolation ─────────────────────────────────────────────────────

  it('interpolates a single string param', () => {
    expect(translator.translate('en', 'greeting', { name: 'Alice' }))
      .toBe('Hello, Alice!');
  });

  it('interpolates multiple params', () => {
    expect(translator.translate('en', 'farewell', { name: 'Bob', days: 7 }))
      .toBe('Goodbye, Bob. See you in 7 days.');
  });

  it('interpolates numeric params', () => {
    expect(translator.interpolate('Value: {n}', { n: 42 })).toBe('Value: 42');
  });

  it('leaves missing param tokens as-is', () => {
    expect(translator.translate('en', 'greeting', {})).toBe('Hello, {name}!');
  });

  it('leaves the template unchanged when params is undefined', () => {
    expect(translator.interpolate('Hello, {name}!')).toBe('Hello, {name}!');
  });

  // ── pluralization ─────────────────────────────────────────────────────

  it('selects "one" branch for count=1', () => {
    expect(translator.translate('en', 'items', { count: 1 })).toBe('1 item');
  });

  it('selects "other" branch for count=2', () => {
    expect(translator.translate('en', 'items', { count: 2 })).toBe('2 items');
  });

  it('selects "other" branch for count=0 when "zero" is absent', () => {
    expect(translator.translate('en', 'items', { count: 0 })).toBe('0 items');
  });

  it('selects "zero" branch when present and count=0', () => {
    expect(translator.translate('en', 'messages', { count: 0 }))
      .toBe('no messages');
  });

  it('resolves # token with the actual count in a plural branch', () => {
    expect(translator.translate('en', 'messages', { count: 5 }))
      .toBe('5 messages');
  });

  it('handles pluralization embedded in a longer sentence', () => {
    expect(translator.translate('en', 'status', { count: 1 }))
      .toBe('You have 1 unread message.');
    expect(translator.translate('en', 'status', { count: 3 }))
      .toBe('You have 3 unread messages.');
  });

  // ── edge cases ────────────────────────────────────────────────────────

  it('overwriting a locale replaces the whole map', () => {
    translator.setTranslations('en', { replaced: 'yes' });
    expect(translator.getTranslations('en')).toEqual({ replaced: 'yes' });
    expect(translator.getTranslations('en')['hello']).toBeUndefined();
  });

  it('interpolate handles zero-value numeric param (falsy but valid)', () => {
    expect(translator.interpolate('Count: {n}', { n: 0 })).toBe('Count: 0');
  });
});
