/**
 * BCP-47 locale identifier string.
 * @example "en", "en-US", "zh-Hans-CN", "pt-BR"
 */
export type Locale = string;

/**
 * ICU plural categories used for pluralization rules.
 * @see https://unicode-org.github.io/cldr-staging/charts/latest/supplemental/language_plural_rules.html
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** All ICU plural categories as an ordered array */
export const PLURAL_CATEGORIES: readonly PluralCategory[] = [
  'zero', 'one', 'two', 'few', 'many', 'other',
] as const;

/**
 * Parsed components of a BCP-47 locale string.
 */
export interface ParsedLocale {
  /** ISO 639 language code (e.g., "en", "zh") */
  language: string;
  /** ISO 3166-1 alpha-2 region code (e.g., "US", "CN") */
  region: string | undefined;
  /** ISO 15924 script code (e.g., "Hans", "Latn") */
  script: string | undefined;
}

/**
 * BCP-47 locale pattern.
 * Matches: "en", "en-US", "zh-Hans", "zh-Hans-CN"
 */
const BCP47_PATTERN = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2})?$/;

/**
 * Validates whether a string is a valid BCP-47 locale identifier.
 * @param value - The string to validate
 * @returns `true` if the string matches BCP-47 format
 */
export function isValidLocale(value: string): value is Locale {
  return BCP47_PATTERN.test(value);
}

/**
 * Parses a BCP-47 locale string into its components.
 * @param locale - A BCP-47 locale string
 * @returns Parsed locale components, or `null` if invalid
 */
export function parseLocale(locale: string): ParsedLocale | null {
  if (!isValidLocale(locale)) {
    return null;
  }
  const parts = locale.split('-');
  const language = parts[0]!;
  let script: string | undefined;
  let region: string | undefined;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length === 4) {
      script = part;
    } else if (part.length === 2) {
      region = part;
    }
  }
  return { language, region, script };
}
