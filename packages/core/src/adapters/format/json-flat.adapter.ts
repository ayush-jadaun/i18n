/**
 * Format adapter for flat JSON translation files.
 *
 * A flat JSON file stores all translation keys at the top level with no
 * nesting. Keys may use dot-notation as plain strings.
 *
 * @example
 * ```json
 * {
 *   "greeting": "Hello",
 *   "auth.login.title": "Sign In"
 * }
 * ```
 *
 * @module adapters/format/json-flat
 */

import type { TranslationMap } from '../../types';
import type { IFormatAdapter, SerializeOptions } from '../../interfaces/format-adapter';

/**
 * Adapter that handles flat JSON translation files.
 *
 * All values at the root level must be strings (no nested objects).
 * Keys may be arbitrary strings, including dot-separated ones.
 *
 * This adapter is stateless and safe for concurrent use.
 */
export class JsonFlatAdapter implements IFormatAdapter {
  /** @inheritdoc */
  readonly formatId = 'json-flat';

  /** @inheritdoc */
  readonly fileExtension = '.json';

  /**
   * Parses a flat JSON string into a {@link TranslationMap}.
   *
   * @param content - Raw flat JSON string
   * @returns A flat map of translation keys to string values
   * @throws {Error} If the content is not valid JSON or contains nested objects
   */
  parse(content: string): TranslationMap {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const map: TranslationMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value !== 'string') {
        throw new Error(
          `JsonFlatAdapter: expected string value for key "${key}", got ${typeof value}`,
        );
      }
      map[key] = value;
    }
    return map;
  }

  /**
   * Serializes a {@link TranslationMap} to a flat JSON string.
   *
   * @param map - Flat translation map to serialize
   * @param options - Optional serialization options
   * @param options.pretty - Whether to pretty-print output (default: `true`)
   * @param options.indent - Number of spaces for indentation (default: `2`)
   * @param options.sortKeys - Whether to sort keys alphabetically (default: `false`)
   * @returns A JSON string representing the flat translation map
   */
  serialize(map: TranslationMap, options?: SerializeOptions): string {
    const pretty = options?.pretty ?? true;
    const indent = options?.indent ?? 2;
    const sortKeys = options?.sortKeys ?? false;

    const target: TranslationMap = sortKeys
      ? Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
      : map;

    return JSON.stringify(target, null, pretty ? indent : 0);
  }

  /**
   * Detects whether the given content is a flat JSON translation file.
   *
   * Returns `true` when the content is valid JSON whose root is an object
   * and all top-level values are primitive strings (no nested objects or arrays).
   *
   * @param content - Raw string content to inspect
   * @returns `true` if the content looks like a flat JSON file
   */
  detect(content: string): boolean {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return false;
      }
      return Object.values(parsed as Record<string, unknown>).every(
        (v) => typeof v === 'string',
      );
    } catch {
      return false;
    }
  }
}
