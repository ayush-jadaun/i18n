/**
 * Format adapter for Android `strings.xml` translation files.
 *
 * Android stores string resources as `<string name="key">value</string>`
 * elements inside a `<resources>` root element. This adapter parses the flat
 * key/value pairs and serializes them back to the same structure.
 *
 * @example
 * ```xml
 * <?xml version="1.0" encoding="UTF-8"?>
 * <resources>
 *   <string name="greeting">Hello</string>
 *   <string name="farewell">Goodbye</string>
 * </resources>
 * ```
 * Parsed as: `{ greeting: "Hello", farewell: "Goodbye" }`
 *
 * @module adapters/format/android-xml
 */

import type { TranslationMap } from '../../types';
import type { IFormatAdapter, SerializeOptions } from '../../interfaces/format-adapter';

/**
 * Matches a `<string name="...">...</string>` element.
 * Capture group 1: the name attribute value.
 * Capture group 2: the text content.
 */
const STRING_ELEMENT_RE = /<string\s+name="([^"]*)"[^>]*>([\s\S]*?)<\/string>/g;

/**
 * Characters that must be escaped in XML text content.
 */
const XML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

/**
 * Named XML entity references that must be unescaped when reading XML content.
 */
const XML_UNESCAPE_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

/**
 * Escapes special XML characters in a string for safe embedding in XML content.
 *
 * @param value - Raw string to escape
 * @returns The XML-escaped string
 */
function escapeXml(value: string): string {
  return value.replace(/[&<>"]/g, (ch) => XML_ESCAPE_MAP[ch] ?? ch);
}

/**
 * Unescapes XML named entity references back to their original characters.
 *
 * @param value - XML-encoded string to unescape
 * @returns The decoded string
 */
function unescapeXml(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|apos);/g, (ent) => XML_UNESCAPE_MAP[ent] ?? ent);
}

/**
 * Adapter that handles Android `strings.xml` translation files.
 *
 * Parsing and serialization are performed with hand-written regex — no
 * external XML library is required.
 *
 * On {@link parse}, each `<string name="...">` element is extracted. The
 * `name` attribute becomes the key and the element text content becomes the
 * value. XML entities are decoded.
 *
 * On {@link serialize}, each key/value pair is written as a
 * `<string name="key">value</string>` line inside a `<resources>` root.
 *
 * This adapter is stateless and safe for concurrent use.
 */
export class AndroidXmlAdapter implements IFormatAdapter {
  /** @inheritdoc */
  readonly formatId = 'android-xml';

  /** @inheritdoc */
  readonly fileExtension = '.xml';

  /**
   * Parses an Android `strings.xml` string into a flat {@link TranslationMap}.
   *
   * Each `<string name="...">` element contributes one entry. The `name`
   * attribute is the key and the element text content is the value. XML
   * entities (`&amp;`, `&lt;`, etc.) are decoded.
   *
   * @param content - Raw Android strings XML file content
   * @returns A flat map of translation keys to string values
   */
  parse(content: string): TranslationMap {
    const map: TranslationMap = {};

    let match: RegExpExecArray | null;
    // Reset lastIndex before iterating (the regex has the `g` flag)
    STRING_ELEMENT_RE.lastIndex = 0;

    while ((match = STRING_ELEMENT_RE.exec(content)) !== null) {
      const name = match[1];
      const text = match[2];

      if (name !== undefined && text !== undefined) {
        map[name] = unescapeXml(text);
      }
    }

    return map;
  }

  /**
   * Serializes a flat {@link TranslationMap} into an Android `strings.xml` string.
   *
   * Each key/value pair becomes a `<string name="key">value</string>` element
   * inside a `<resources>` root. Special XML characters in both names and
   * values are escaped.
   *
   * @param map - Flat translation map to serialize
   * @param options - Optional serialization options
   * @param options.indent - Number of spaces per indentation level (default: `2`)
   * @param options.sortKeys - Whether to sort keys alphabetically (default: `false`)
   * @returns An Android strings XML string representing the translation map
   */
  serialize(map: TranslationMap, options?: SerializeOptions): string {
    const indent = options?.indent ?? 2;
    const sortKeys = options?.sortKeys ?? false;

    const sp = ' '.repeat(indent);

    const entries = sortKeys
      ? Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      : Object.entries(map);

    const lines = entries.map(([key, value]) => {
      const escapedName = escapeXml(key);
      const escapedValue = escapeXml(value);
      return `${sp}<string name="${escapedName}">${escapedValue}</string>`;
    });

    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<resources>\n` +
      (lines.length > 0 ? `${lines.join('\n')}\n` : '') +
      `</resources>\n`
    );
  }

  /**
   * Detects whether the given content is an Android `strings.xml` file.
   *
   * Returns `true` when the content contains both a `<resources>` tag and at
   * least one `<string` child element. This combination is the defining
   * signature of the Android string resources format.
   *
   * @param content - Raw string content to inspect
   * @returns `true` if the content looks like an Android strings XML file
   */
  detect(content: string): boolean {
    return /<resources[\s\S]*<string\s/.test(content);
  }
}
