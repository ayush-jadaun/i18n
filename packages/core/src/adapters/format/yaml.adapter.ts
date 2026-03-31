/**
 * Format adapter for nested YAML translation files.
 *
 * A YAML translation file stores keys as a deeply nested object tree using
 * YAML syntax. This adapter flattens nested keys to dot-separated strings on
 * parse and unflattens them back to a nested structure on serialize.
 *
 * @example
 * ```yaml
 * auth:
 *   login:
 *     title: Sign In
 * greeting: Hello
 * ```
 * Parsed as: `{ "auth.login.title": "Sign In", greeting: "Hello" }`
 *
 * @module adapters/format/yaml
 */

import { load, dump } from 'js-yaml';
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
 * @returns A nested object suitable for YAML serialization
 */
function unflattenObject(map: TranslationMap): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [flatKey, value] of Object.entries(map)) {
    const parts = flatKey.split('.');
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      // parts[i] is always defined because i < parts.length - 1
      const part = parts[i] as string;
      if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    // parts[parts.length - 1] is always defined for a non-empty parts array
    const lastPart = parts[parts.length - 1] as string;
    current[lastPart] = value;
  }

  return result;
}

/**
 * Adapter that handles nested YAML translation files.
 *
 * On {@link parse}, nested keys are flattened to dot-separated paths.
 * On {@link serialize}, dot-separated paths are expanded back into a nested
 * object before writing YAML.
 *
 * The {@link detect} method returns `true` only when the content is valid YAML
 * but **not** valid JSON, which prevents overlap with JSON adapters.
 *
 * This adapter is stateless and safe for concurrent use.
 */
export class YamlAdapter implements IFormatAdapter {
  /** @inheritdoc */
  readonly formatId = 'yaml';

  /** @inheritdoc */
  readonly fileExtension = '.yaml';

  /**
   * Parses a nested YAML string into a flat {@link TranslationMap}.
   *
   * Nested object keys are joined with a `.` separator to form flat keys.
   *
   * @param content - Raw nested YAML string
   * @returns A flat map of dot-separated translation keys to string values
   * @throws {Error} If the content is not valid YAML or does not produce an object
   */
  parse(content: string): TranslationMap {
    const parsed = load(content);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('YamlAdapter: content did not parse to a YAML object');
    }
    return flattenObject(parsed as Record<string, unknown>);
  }

  /**
   * Serializes a flat {@link TranslationMap} into a nested YAML string.
   *
   * Dot-separated keys are expanded into nested objects before serialization.
   *
   * @param map - Flat translation map with dot-separated keys
   * @param options - Optional serialization options
   * @param options.indent - Number of spaces for indentation (default: `2`)
   * @param options.sortKeys - Whether to sort keys alphabetically (default: `false`)
   * @returns A nested YAML string representing the translation map
   */
  serialize(map: TranslationMap, options?: SerializeOptions): string {
    const indent = options?.indent ?? 2;
    const sortKeys = options?.sortKeys ?? false;

    const source: TranslationMap = sortKeys
      ? Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
      : map;

    const nested = unflattenObject(source);
    return dump(nested, { indent, sortKeys });
  }

  /**
   * Detects whether the given content is a YAML translation file.
   *
   * Returns `true` when the content parses as valid YAML that produces an
   * object root, **and** the content is not valid JSON. This ensures JSON files
   * are not mis-detected as YAML (since JSON is a subset of YAML).
   *
   * @param content - Raw string content to inspect
   * @returns `true` if the content looks like a YAML (non-JSON) file
   */
  detect(content: string): boolean {
    // Reject content that is valid JSON — JSON is technically valid YAML,
    // but it should be handled by a JSON adapter instead.
    try {
      JSON.parse(content);
      return false;
    } catch {
      // Not JSON — proceed to check YAML validity
    }

    try {
      const parsed = load(content);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }
}
