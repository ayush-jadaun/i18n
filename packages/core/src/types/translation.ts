import type { Locale, PluralCategory } from './locale';

/**
 * A dot-separated translation key.
 * @example "auth.login.title", "common.buttons.submit"
 */
export type TranslationKey = string;

/**
 * A translation value with optional pluralization and metadata.
 */
export interface TranslationValue {
  /** The translated string */
  value: string;
  /** Plural forms keyed by ICU plural category */
  pluralForms?: Partial<Record<PluralCategory, string>>;
  /** Disambiguation context for translators */
  context?: string;
  /** Human-readable description for translators */
  description?: string;
  /** Maximum character length for the translated string */
  maxLength?: number;
  /** URLs to screenshot images showing where this key is used */
  screenshots?: string[];
}

/**
 * A flat map of translation keys to their string values.
 */
export type TranslationMap = Record<TranslationKey, string>;

/**
 * A full translation entry including value and all metadata.
 */
export interface TranslationEntry {
  /** The translation key */
  key: TranslationKey;
  /** The locale this translation is for */
  locale: Locale;
  /** The translated string value */
  value: string;
  /** Current lifecycle status of the translation */
  status: TranslationStatus;
  /** Identifier of the user or system that produced the translation */
  translatedBy: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
}

/**
 * Translation lifecycle status.
 */
export type TranslationStatus =
  | 'untranslated'
  | 'machine_translated'
  | 'needs_review'
  | 'reviewed'
  | 'approved'
  | 'published';

/** All translation statuses in lifecycle order */
export const TRANSLATION_STATUSES: readonly TranslationStatus[] = [
  'untranslated', 'machine_translated', 'needs_review',
  'reviewed', 'approved', 'published',
] as const;

const KEY_PATTERN = /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/;

/**
 * Validates whether a string is a valid translation key.
 * @param value - The string to validate
 * @returns `true` if the string is a valid dot-separated key
 */
export function isValidTranslationKey(value: string): value is TranslationKey {
  return KEY_PATTERN.test(value);
}
