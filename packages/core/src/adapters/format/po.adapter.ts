/**
 * Format adapter for GNU gettext PO translation files.
 *
 * A PO file stores translations as `msgid`/`msgstr` pairs. The `msgid` is
 * used as the translation key and `msgstr` as the translated value. Entries
 * with an empty `msgid` (the PO header) are silently skipped.
 *
 * @example
 * ```po
 * msgid "greeting"
 * msgstr "Hello"
 *
 * msgid "auth.login.title"
 * msgstr "Sign In"
 * ```
 * Parsed as: `{ greeting: "Hello", "auth.login.title": "Sign In" }`
 *
 * @module adapters/format/po
 */

import type { TranslationMap } from '../../types';
import type { IFormatAdapter, SerializeOptions } from '../../interfaces/format-adapter';

/** Matches a quoted string value after `msgid ` or `msgstr `. */
const QUOTED_VALUE_RE = /^"(.*)"$/;

/**
 * Extracts the bare string value from a PO quoted token (e.g. `"Hello"` → `Hello`).
 *
 * @param token - The raw token following a `msgid` or `msgstr` directive
 * @returns The unquoted string value
 * @throws {Error} If the token is not properly double-quoted
 */
function unquote(token: string): string {
  const match = QUOTED_VALUE_RE.exec(token.trim());
  if (!match || match[1] === undefined) {
    throw new Error(`PoAdapter: expected a quoted PO value, got: ${token}`);
  }
  // Handle basic escape sequences produced by the serializer
  return match[1]
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/**
 * Escapes a translation value for safe embedding inside PO double-quoted strings.
 *
 * @param value - Raw translation string
 * @returns The escaped string
 */
function escapeValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * Adapter that handles GNU gettext PO translation files.
 *
 * Parsing and serialization are performed with a hand-written parser — no
 * external dependencies are required.
 *
 * On {@link parse}, `msgid`/`msgstr` pairs are extracted into a flat
 * {@link TranslationMap}. The PO header entry (empty `msgid`) is ignored.
 * On {@link serialize}, the map is written back as `msgid`/`msgstr` pairs
 * separated by blank lines.
 *
 * This adapter is stateless and safe for concurrent use.
 */
export class PoAdapter implements IFormatAdapter {
  /** @inheritdoc */
  readonly formatId = 'po';

  /** @inheritdoc */
  readonly fileExtension = '.po';

  /**
   * Parses a PO file string into a flat {@link TranslationMap}.
   *
   * Each `msgid`/`msgstr` pair becomes one entry in the map. Entries with an
   * empty `msgid` (the PO header) are skipped.
   *
   * @param content - Raw PO file content
   * @returns A flat map of translation keys to string values
   */
  parse(content: string): TranslationMap {
    const map: TranslationMap = {};
    const lines = content.split('\n');

    let currentMsgid: string | null = null;
    let currentMsgstr: string | null = null;

    const commitEntry = (): void => {
      if (currentMsgid !== null && currentMsgstr !== null && currentMsgid !== '') {
        map[currentMsgid] = currentMsgstr;
      }
      currentMsgid = null;
      currentMsgstr = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('msgid ')) {
        // Commit any previously accumulated entry before starting a new one
        commitEntry();
        currentMsgid = unquote(trimmed.slice('msgid '.length));
      } else if (trimmed.startsWith('msgstr ')) {
        currentMsgstr = unquote(trimmed.slice('msgstr '.length));
      }
      // Lines that are blank, comments (#), or flags are ignored
    }

    // Commit the last entry in the file
    commitEntry();

    return map;
  }

  /**
   * Serializes a flat {@link TranslationMap} into a PO file string.
   *
   * Entries are written as `msgid`/`msgstr` pairs separated by blank lines.
   * If `options.sortKeys` is `true`, entries are sorted alphabetically by key.
   *
   * @param map - Flat translation map to serialize
   * @param options - Optional serialization options
   * @param options.sortKeys - Whether to sort keys alphabetically (default: `false`)
   * @returns A PO file string representing the translation map
   */
  serialize(map: TranslationMap, options?: SerializeOptions): string {
    const sortKeys = options?.sortKeys ?? false;

    const entries = sortKeys
      ? Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      : Object.entries(map);

    return (
      entries
        .map(([key, value]) => `msgid "${escapeValue(key)}"\nmsgstr "${escapeValue(value)}"`)
        .join('\n\n') + '\n'
    );
  }

  /**
   * Detects whether the given content is a PO translation file.
   *
   * Returns `true` when the content contains at least one `msgid` directive
   * and at least one `msgstr` directive, which are the defining markers of
   * the GNU gettext PO format.
   *
   * @param content - Raw string content to inspect
   * @returns `true` if the content looks like a PO file
   */
  detect(content: string): boolean {
    return /\bmsgid\s+"/.test(content) && /\bmsgstr\s+"/.test(content);
  }
}
