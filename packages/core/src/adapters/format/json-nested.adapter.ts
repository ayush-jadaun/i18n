/**
 * Format adapter for nested JSON translation files.
 *
 * A nested JSON file stores translation keys as a deeply nested object tree.
 * This adapter flattens nested keys into dot-separated strings on parse and
 * unflattens them back into a nested structure on serialize.
 *
 * @example
 * ```json
 * {
 *   "auth": {
 *     "login": {
 *       "title": "Sign In"
 *     }
 *   }
 * }
 * ```
 * Parsed as: `{ "auth.login.title": "Sign In" }`
 *
 * @module adapters/format/json-nested
 */

import type { TranslationMap } from '../../types';
import type { IFormatAdapter, SerializeOptions } from '../../interfaces/format-adapter';

/**
 * Recursively flattens a nested object into dot-separated key paths.
 *
 * @param obj - The object to flatten
 * @param prefix - Accumulated key prefix for the current recursion level
 * @param result - Accumulator map that collects flattened entries
 * @returns The completed flat {@link TranslationMap}
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  result: TranslationMap = {},
): TranslationMap {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, fullKey, result);
    } else {
      result[fullKey] = String(value);
    }
  }
  return result;
}

/**
 * Unflattens a dot-separated key map into a deeply nested object tree.
 *
 * @param map - Flat {@link TranslationMap} with dot-separated keys
 * @returns A nested object suitable for JSON serialization
 */
function unflattenObject(map: TranslationMap): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [flatKey, value] of Object.entries(map)) {
    const parts = flatKey.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}

/**
 * Adapter that handles nested JSON translation files.
 *
 * On {@link parse}, nested keys are flattened to dot-separated paths.
 * On {@link serialize}, dot-separated paths are expanded back into a nested
 * object before writing JSON.
 *
 * This adapter is stateless and safe for concurrent use.
 */
export class JsonNestedAdapter implements IFormatAdapter {
  /** @inheritdoc */
  readonly formatId = 'json-nested';

  /** @inheritdoc */
  readonly fileExtension = '.json';

  /**
   * Parses a nested JSON string into a flat {@link TranslationMap}.
   *
   * Nested object keys are joined with a `.` separator to form flat keys.
   *
   * @param content - Raw nested JSON string
   * @returns A flat map of dot-separated translation keys to string values
   * @throws {Error} If the content is not valid JSON
   */
  parse(content: string): TranslationMap {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return flattenObject(parsed);
  }

  /**
   * Serializes a flat {@link TranslationMap} into a nested JSON string.
   *
   * Dot-separated keys are expanded into nested objects before serialization.
   *
   * @param map - Flat translation map with dot-separated keys
   * @param options - Optional serialization options
   * @param options.pretty - Whether to pretty-print output (default: `true`)
   * @param options.indent - Number of spaces for indentation (default: `2`)
   * @param options.sortKeys - Whether to sort top-level keys alphabetically (default: `false`)
   * @returns A nested JSON string representing the translation map
   */
  serialize(map: TranslationMap, options?: SerializeOptions): string {
    const pretty = options?.pretty ?? true;
    const indent = options?.indent ?? 2;
    const sortKeys = options?.sortKeys ?? false;

    const source: TranslationMap = sortKeys
      ? Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
      : map;

    const nested = unflattenObject(source);
    return JSON.stringify(nested, null, pretty ? indent : 0);
  }

  /**
   * Detects whether the given content is a nested JSON translation file.
   *
   * Returns `true` when the content is valid JSON whose root is an object
   * and at least one top-level value is itself an object (indicating nesting).
   *
   * @param content - Raw string content to inspect
   * @returns `true` if the content looks like a nested JSON file
   */
  detect(content: string): boolean {
    try {
      const parsed = JSON.parse(content) as unknown;
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return false;
      }
      return Object.values(parsed as Record<string, unknown>).some(
        (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
      );
    } catch {
      return false;
    }
  }
}
