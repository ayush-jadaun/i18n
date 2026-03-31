import { describe, it, expect } from 'vitest';
import {
  TRANSLATION_STATUSES,
  isValidTranslationKey,
} from './translation';

describe('Translation types', () => {
  describe('TRANSLATION_STATUSES', () => {
    it('should contain all status values in lifecycle order', () => {
      expect(TRANSLATION_STATUSES).toEqual([
        'untranslated',
        'machine_translated',
        'needs_review',
        'reviewed',
        'approved',
        'published',
      ]);
    });
  });

  describe('isValidTranslationKey', () => {
    it('should accept valid dot-separated keys', () => {
      expect(isValidTranslationKey('greeting')).toBe(true);
      expect(isValidTranslationKey('auth.login.title')).toBe(true);
      expect(isValidTranslationKey('common.buttons.submit')).toBe(true);
      expect(isValidTranslationKey('errors.404')).toBe(true);
      expect(isValidTranslationKey('nav.menu_item')).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(isValidTranslationKey('')).toBe(false);
      expect(isValidTranslationKey('.')).toBe(false);
      expect(isValidTranslationKey('.leading')).toBe(false);
      expect(isValidTranslationKey('trailing.')).toBe(false);
      expect(isValidTranslationKey('double..dot')).toBe(false);
      expect(isValidTranslationKey('has space')).toBe(false);
    });
  });
});
