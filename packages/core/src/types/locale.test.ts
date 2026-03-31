import { describe, it, expect } from 'vitest';
import {
  PLURAL_CATEGORIES,
  isValidLocale,
  parseLocale,
} from './locale';
import type { Locale, PluralCategory, ParsedLocale } from './locale';

describe('Locale types', () => {
  describe('PLURAL_CATEGORIES', () => {
    it('should contain all ICU plural categories', () => {
      expect(PLURAL_CATEGORIES).toEqual(['zero', 'one', 'two', 'few', 'many', 'other']);
    });
  });

  describe('isValidLocale', () => {
    it('should accept valid BCP-47 locales', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('en-US')).toBe(true);
      expect(isValidLocale('fr-FR')).toBe(true);
      expect(isValidLocale('zh-Hans-CN')).toBe(true);
      expect(isValidLocale('pt-BR')).toBe(true);
    });

    it('should reject invalid locales', () => {
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('x')).toBe(false);
      expect(isValidLocale('english')).toBe(false);
      expect(isValidLocale('en_US')).toBe(false);
      expect(isValidLocale('123')).toBe(false);
    });
  });

  describe('parseLocale', () => {
    it('should parse a simple language code', () => {
      const result = parseLocale('en');
      expect(result).toEqual({ language: 'en', region: undefined, script: undefined });
    });

    it('should parse language with region', () => {
      const result = parseLocale('en-US');
      expect(result).toEqual({ language: 'en', region: 'US', script: undefined });
    });

    it('should parse language with script and region', () => {
      const result = parseLocale('zh-Hans-CN');
      expect(result).toEqual({ language: 'zh', region: 'CN', script: 'Hans' });
    });

    it('should return null for invalid locale', () => {
      expect(parseLocale('invalid')).toBeNull();
    });
  });
});
