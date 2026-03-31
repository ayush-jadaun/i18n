/**
 * Format adapter interface for parsing and serializing translation files.
 *
 * Implement this interface to add support for a new file format
 * (e.g., JSON, YAML, PO, XLIFF, ARB).
 *
 * @module interfaces/format-adapter
 */

import type { TranslationMap } from '../types';

/**
 * Options that control how a {@link IFormatAdapter} serializes a {@link TranslationMap}.
 */
export interface SerializeOptions {
  /**
   * Whether to pretty-print the output (e.g., add indentation and newlines).
   * Defaults to `true` when omitted.
   */
  pretty?: boolean;
  /**
   * Number of spaces used for indentation when `pretty` is `true`.
   * Defaults to 2.
   */
  indent?: number;
  /**
   * Whether to sort translation keys alphabetically in the output.
   * Defaults to `false`.
   */
  sortKeys?: boolean;
}

/**
 * Adapter that handles a specific translation file format.
 *
 * Implementations must be stateless — the same adapter instance may be used
 * concurrently for multiple files.
 *
 * @example
 * ```ts
 * class JsonFormatAdapter implements IFormatAdapter {
 *   readonly formatId = 'json';
 *   readonly fileExtension = '.json';
 *
 *   parse(content: string): TranslationMap {
 *     return JSON.parse(content) as TranslationMap;
 *   }
 *
 *   serialize(map: TranslationMap, options?: SerializeOptions): string {
 *     return JSON.stringify(map, null, options?.indent ?? 2);
 *   }
 *
 *   detect(content: string): boolean {
 *     try { JSON.parse(content); return true; } catch { return false; }
 *   }
 * }
 * ```
 */
export interface IFormatAdapter {
  /**
   * Unique identifier for this format.
   * @example "json", "yaml", "po", "xliff", "arb"
   */
  readonly formatId: string;

  /**
   * File extension (including the leading dot) associated with this format.
   * @example ".json", ".yaml", ".po"
   */
  readonly fileExtension: string;

  /**
   * Parses the raw file content into a flat {@link TranslationMap}.
   *
   * @param content - Raw string content of the translation file
   * @returns A flat map of translation keys to their string values
   * @throws {Error} If the content cannot be parsed as the expected format
   */
  parse(content: string): TranslationMap;

  /**
   * Serializes a {@link TranslationMap} into the format's string representation.
   *
   * @param map - Flat translation map to serialize
   * @param options - Optional serialization options
   * @returns The serialized string ready to be written to a file
   */
  serialize(map: TranslationMap, options?: SerializeOptions): string;

  /**
   * Heuristically detects whether the given content looks like this format.
   *
   * Used for auto-detection when the file extension is ambiguous or missing.
   *
   * @param content - Raw string content to inspect
   * @returns `true` if the content is likely this format
   */
  detect(content: string): boolean;
}
