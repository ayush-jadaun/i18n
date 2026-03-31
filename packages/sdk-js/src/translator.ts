/**
 * Translation engine — interpolation and ICU-like pluralization.
 *
 * @module translator
 */

import type { TranslationMap } from '@i18n-platform/core';

/** ICU plural category names that the engine recognises. */
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'] as const;
type PluralCategory = (typeof PLURAL_CATEGORIES)[number];

/**
 * Maps a numeric count to an ICU plural category using the `Intl.PluralRules`
 * API.  Falls back to a simple English rule when the locale is unavailable.
 *
 * @param count - The number to classify
 * @param locale - BCP-47 locale used to select the rule set
 * @returns The matching plural category
 */
function getPluralCategory(count: number, locale: string): PluralCategory {
  try {
    const rules = new Intl.PluralRules(locale);
    return rules.select(count) as PluralCategory;
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

/**
 * Parses an ICU-like plural expression and returns the appropriate branch.
 *
 * Syntax: `{count, plural, one {# item} other {# items}}`
 *
 * - The `#` token inside a branch is replaced by the raw count value.
 * - Unknown categories are skipped; `other` is the mandatory fallback.
 *
 * @param expression - The full ICU plural expression string (without outer braces)
 * @param params - Interpolation parameters (must contain the variable named in the expression)
 * @param locale - Active locale used for plural-rule selection
 * @returns The resolved branch string, or the original expression if parsing fails
 */
function resolvePlural(
  expression: string,
  params: Record<string, string | number>,
  locale: string,
): string {
  // expression: "count, plural, one {# item} other {# items}"
  const commaIdx = expression.indexOf(',');
  if (commaIdx === -1) return `{${expression}}`;

  const varName = expression.slice(0, commaIdx).trim();
  const rest = expression.slice(commaIdx + 1).trim();

  // Confirm this is a plural expression
  const pluralKeywordMatch = /^plural\s*,\s*/i.exec(rest);
  if (!pluralKeywordMatch) return `{${expression}}`;

  const branchSection = rest.slice(pluralKeywordMatch[0].length);

  // Parse branches: category {text}
  const branchRegex = /(\w+)\s*\{([^}]*)\}/g;
  const branches: Partial<Record<PluralCategory | string, string>> = {};
  let match: RegExpExecArray | null;
  while ((match = branchRegex.exec(branchSection)) !== null) {
    branches[match[1]!] = match[2]!;
  }

  const count = Number(params[varName] ?? 0);
  const category = getPluralCategory(count, locale);

  // When an explicit 'zero' branch is provided, use it for a zero count even
  // if the locale's plural rules map 0 to a different category (e.g. 'other'
  // in English). This mirrors the behaviour of popular i18n libraries.
  const resolvedCategory = count === 0 && branches['zero'] !== undefined ? 'zero' : category;

  const branch = branches[resolvedCategory] ?? branches['other'] ?? `{${expression}}`;
  // Replace `#` with the actual count
  return branch.replace(/#/g, String(count));
}

/**
 * Core translation engine.
 *
 * Holds an in-memory map of `locale → TranslationMap` and resolves keys with
 * optional parameter interpolation and ICU-like pluralisation.
 *
 * @example
 * ```ts
 * const translator = new Translator();
 * translator.setTranslations('en', { greeting: 'Hello, {name}!' });
 * translator.translate('en', 'greeting', { name: 'Alice' }); // "Hello, Alice!"
 * ```
 */
export class Translator {
  private readonly translations: Map<string, TranslationMap> = new Map();

  /**
   * Stores (or replaces) the translation map for a locale.
   *
   * @param locale - BCP-47 locale code
   * @param map - Flat key→value translation map
   */
  setTranslations(locale: string, map: TranslationMap): void {
    this.translations.set(locale, map);
  }

  /**
   * Merges additional keys into an existing locale's translation map.
   * If no map exists for the locale yet it behaves like {@link setTranslations}.
   *
   * @param locale - BCP-47 locale code
   * @param map - Partial translation map to merge in
   */
  mergeTranslations(locale: string, map: TranslationMap): void {
    const existing = this.translations.get(locale) ?? {};
    this.translations.set(locale, { ...existing, ...map });
  }

  /**
   * Returns the full translation map for a locale.
   *
   * @param locale - BCP-47 locale code
   * @returns The stored map, or an empty object when the locale is not loaded
   */
  getTranslations(locale: string): TranslationMap {
    return this.translations.get(locale) ?? {};
  }

  /**
   * Returns `true` when a translation map has been loaded for the locale.
   *
   * @param locale - BCP-47 locale code
   */
  hasLocale(locale: string): boolean {
    return this.translations.has(locale);
  }

  /**
   * Translates a key in the given locale.
   *
   * Resolution order:
   * 1. Exact key in `locale`
   * 2. Exact key in `fallbackLocale` (when provided and different from `locale`)
   * 3. The raw `key` string itself
   *
   * After the template is found, {@link interpolate} resolves `{param}` tokens
   * and ICU plural expressions.
   *
   * @param locale - Active locale
   * @param key - Translation key
   * @param params - Optional interpolation / pluralisation parameters
   * @param fallbackLocale - Secondary locale to try when the key is missing
   * @returns The translated and interpolated string
   */
  translate(
    locale: string,
    key: string,
    params?: Record<string, string | number>,
    fallbackLocale?: string,
  ): string {
    const map = this.translations.get(locale);
    let template = map?.[key];

    if (template === undefined && fallbackLocale && fallbackLocale !== locale) {
      const fallbackMap = this.translations.get(fallbackLocale);
      template = fallbackMap?.[key];
    }

    if (template === undefined) return key;
    return this.interpolate(template, params, locale);
  }

  /**
   * Resolves `{param}` tokens and ICU plural expressions within a template string.
   *
   * Plain token: `{name}` → replaced with `params.name` (falls back to `{name}` literal)
   * Plural expression: `{count, plural, one {# item} other {# items}}`
   *
   * Uses a depth-aware scanner so that nested braces inside ICU plural branches
   * are handled correctly (a simple `[^}]+` regex would stop at the first `}`
   * inside a nested branch).
   *
   * @param template - The raw template string from the translation map
   * @param params - Key/value substitution map
   * @param locale - Used for plural-rule selection
   * @returns The fully resolved string
   */
  interpolate(
    template: string,
    params?: Record<string, string | number>,
    locale = 'en',
  ): string {
    if (!params) return template;

    let result = '';
    let i = 0;

    while (i < template.length) {
      if (template[i] !== '{') {
        result += template[i];
        i++;
        continue;
      }

      // Find the matching closing brace, tracking depth for nested braces.
      let depth = 1;
      let j = i + 1;
      while (j < template.length && depth > 0) {
        if (template[j] === '{') depth++;
        else if (template[j] === '}') depth--;
        j++;
      }

      if (depth !== 0) {
        // Unmatched opening brace — emit as-is and advance past it.
        result += template[i];
        i++;
        continue;
      }

      // inner = content between the outermost { and }
      const inner = template.slice(i + 1, j - 1).trim();

      if (/,/.test(inner)) {
        // ICU plural expression
        result += resolvePlural(inner, params, locale);
      } else {
        // Plain interpolation
        const value = params[inner];
        result += value !== undefined ? String(value) : `{${inner}}`;
      }

      i = j;
    }

    return result;
  }
}
