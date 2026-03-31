/**
 * Format adapter for Apple iOS/macOS .strings translation files.
 *
 * The .strings format stores translations as key = value pairs where both the
 * key and value are double-quoted strings terminated by a semicolon. Lines
 * beginning with // (line comments) or enclosed in block comment delimiters
 * are treated as comments and ignored during parsing.
 *
 * @module adapters/format/ios-strings
 */

import type { TranslationMap } from '../../types';
import type { IFormatAdapter, SerializeOptions } from '../../interfaces/format-adapter';

/**
 * Matches a key/value pair line in the .strings format.
 *
 * The pattern handles escaped double-quotes inside keys and values.
 * Capture group 1: the key (without surrounding quotes, with escapes intact).
 * Capture group 2: the value (without surrounding quotes, with escapes intact).
 */
const KEY_VALUE_RE = /^"((?:[^"\\]|\\.)*)"\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/;

/**
 * Unescapes escape sequences found in .strings quoted values.
 *
 * Handles backslash-quote and double-backslash sequences, which are the most
 * common escape sequences in this format.
 *
 * @param raw - The raw string content between quotes (with escape sequences)
 * @returns The decoded string
 */
function unescapeStrings(raw: string): string {
  return raw.replace(/\\(["\\])/g, '$1');
}

/**
 * Escapes special characters for safe embedding inside .strings double quotes.
 *
 * @param value - Raw string to escape
 * @returns The escaped string
 */
function escapeStrings(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Adapter that handles Apple iOS/macOS .strings translation files.
 *
 * Parsing and serialization are performed with hand-written regex — no
 * external library is required.
 *
 * On {@link parse}, each quoted-key = quoted-value line is extracted. Lines
 * starting with // (line comments) or enclosed in block comments are silently
 * skipped. Escape sequences inside quoted strings are decoded.
 *
 * On {@link serialize}, each key/value pair is written as a quoted-key =
 * quoted-value line terminated by a semicolon. Special characters inside keys
 * and values are escaped.
 *
 * This adapter is stateless and safe for concurrent use.
 */
export class IosStringsAdapter implements IFormatAdapter {
  /** @inheritdoc */
  readonly formatId = 'ios-strings';

  /** @inheritdoc */
  readonly fileExtension = '.strings';

  /**
   * Parses an iOS .strings file content into a flat {@link TranslationMap}.
   *
   * Lines in the quoted-key = quoted-value; format are extracted as translation
   * entries. Line comments (// ...) and block comments are skipped. Escape
   * sequences for backslash and double-quote are decoded in both keys and values.
   *
   * @param content - Raw iOS .strings file content
   * @returns A flat map of translation keys to string values
   */
  parse(content: string): TranslationMap {
    const map: TranslationMap = {};

    // Strip block comments (/* ... */) before line processing
    const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');

    for (const line of stripped.split('\n')) {
      const trimmed = line.trim();

      // Skip empty lines and line comments
      if (!trimmed || trimmed.startsWith('//')) continue;

      const match = KEY_VALUE_RE.exec(trimmed);
      if (match?.[1] !== undefined && match[2] !== undefined) {
        const key = unescapeStrings(match[1]);
        const value = unescapeStrings(match[2]);
        map[key] = value;
      }
    }

    return map;
  }

  /**
   * Serializes a flat {@link TranslationMap} into an iOS .strings string.
   *
   * Each key/value pair is written as a quoted-key = quoted-value line
   * terminated by a semicolon. Double-quote characters and backslashes inside
   * keys and values are escaped.
   *
   * @param map - Flat translation map to serialize
   * @param options - Optional serialization options
   * @param options.sortKeys - Whether to sort keys alphabetically (default: `false`)
   * @returns An iOS .strings file content string representing the translation map
   */
  serialize(map: TranslationMap, options?: SerializeOptions): string {
    const sortKeys = options?.sortKeys ?? false;

    const entries = sortKeys
      ? Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      : Object.entries(map);

    if (entries.length === 0) return '';

    return entries
      .map(([key, value]) => `"${escapeStrings(key)}" = "${escapeStrings(value)}";`)
      .join('\n') + '\n';
  }

  /**
   * Detects whether the given content is an iOS .strings translation file.
   *
   * Returns `true` when the content contains at least one line matching the
   * quoted-key = quoted-value pattern with a terminating semicolon, which is
   * the defining signature of the iOS .strings format.
   *
   * @param content - Raw string content to inspect
   * @returns `true` if the content looks like an iOS .strings file
   */
  detect(content: string): boolean {
    return /"[^"]*"\s*=\s*"[^"]*"\s*;/.test(content);
  }
}
