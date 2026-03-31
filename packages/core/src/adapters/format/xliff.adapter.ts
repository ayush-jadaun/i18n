/**
 * Format adapter for XLIFF 1.2 translation files.
 *
 * XLIFF (XML Localisation Interchange File Format) 1.2 stores translations as
 * `<trans-unit>` elements inside a `<body>` block. Each unit has an `id`
 * attribute used as the translation key, with `<source>` and `<target>` child
 * elements holding the original and translated text.
 *
 * @example
 * ```xml
 * <?xml version="1.0" encoding="UTF-8"?>
 * <xliff version="1.2">
 *   <file source-language="en" target-language="fr">
 *     <body>
 *       <trans-unit id="greeting">
 *         <source>Hello</source>
 *         <target>Bonjour</target>
 *       </trans-unit>
 *     </body>
 *   </file>
 * </xliff>
 * ```
 * Parsed as: `{ greeting: "Bonjour" }`
 *
 * @module adapters/format/xliff
 */

import type { TranslationMap } from '../../types';
import type { IFormatAdapter, SerializeOptions } from '../../interfaces/format-adapter';

/**
 * Matches a `<trans-unit id="...">...</trans-unit>` block.
 * Capture group 1: the id value, capture group 2: the block body.
 */
const TRANS_UNIT_RE =
  /<trans-unit\s+id="([^"]*)"[^>]*>([\s\S]*?)<\/trans-unit>/g;

/**
 * Matches the text content inside a `<target>...</target>` element.
 * Capture group 1: the text content.
 */
const TARGET_RE = /<target>([\s\S]*?)<\/target>/;

/**
 * Matches the text content inside a `<source>...</source>` element.
 * Capture group 1: the text content.
 */
const SOURCE_RE = /<source>([\s\S]*?)<\/source>/;

/**
 * Characters that must be escaped in XML text content and attribute values.
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
 * Adapter that handles XLIFF 1.2 translation files.
 *
 * Parsing and serialization are performed with hand-written regex — no
 * external XML library is required.
 *
 * On {@link parse}, each `<trans-unit>` block is extracted by its `id`
 * attribute. The value of the `<target>` element is used as the translation
 * value; if no `<target>` is present the `<source>` text is used as the
 * fallback.
 *
 * On {@link serialize}, each key/value pair is written as a `<trans-unit>`
 * element with identical `<source>` and `<target>` text.
 *
 * This adapter is stateless and safe for concurrent use.
 */
export class XliffAdapter implements IFormatAdapter {
  /** @inheritdoc */
  readonly formatId = 'xliff';

  /** @inheritdoc */
  readonly fileExtension = '.xlf';

  /**
   * Parses an XLIFF 1.2 string into a flat {@link TranslationMap}.
   *
   * Each `<trans-unit>` element contributes one entry. The `id` attribute
   * becomes the key. The `<target>` text is the value; if no `<target>` is
   * present the `<source>` text is used instead. XML entities are decoded.
   *
   * @param content - Raw XLIFF 1.2 file content
   * @returns A flat map of translation keys to string values
   */
  parse(content: string): TranslationMap {
    const map: TranslationMap = {};

    let match: RegExpExecArray | null;
    // Reset lastIndex before iterating (the regex has the `g` flag)
    TRANS_UNIT_RE.lastIndex = 0;

    while ((match = TRANS_UNIT_RE.exec(content)) !== null) {
      const id = match[1];
      const body = match[2];

      if (id === undefined || body === undefined) continue;

      const targetMatch = TARGET_RE.exec(body);
      if (targetMatch?.[1] !== undefined) {
        map[id] = unescapeXml(targetMatch[1]);
        continue;
      }

      const sourceMatch = SOURCE_RE.exec(body);
      if (sourceMatch?.[1] !== undefined) {
        map[id] = unescapeXml(sourceMatch[1]);
      }
    }

    return map;
  }

  /**
   * Serializes a flat {@link TranslationMap} into an XLIFF 1.2 string.
   *
   * Each key/value pair becomes a `<trans-unit>` element where the `id`
   * attribute is the key and both `<source>` and `<target>` contain the value.
   * Special XML characters in keys and values are escaped.
   *
   * @param map - Flat translation map to serialize
   * @param options - Optional serialization options
   * @param options.indent - Number of spaces per indentation level (default: `2`)
   * @param options.sortKeys - Whether to sort keys alphabetically (default: `false`)
   * @returns An XLIFF 1.2 XML string representing the translation map
   */
  serialize(map: TranslationMap, options?: SerializeOptions): string {
    const indent = options?.indent ?? 2;
    const sortKeys = options?.sortKeys ?? false;

    const sp = ' '.repeat(indent);
    const sp2 = sp.repeat(2);
    const sp3 = sp.repeat(3);
    const sp4 = sp.repeat(4);

    const entries = sortKeys
      ? Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      : Object.entries(map);

    const units = entries
      .map(([key, value]) => {
        const escapedId = escapeXml(key);
        const escapedValue = escapeXml(value);
        return (
          `${sp3}<trans-unit id="${escapedId}">\n` +
          `${sp4}<source>${escapedValue}</source>\n` +
          `${sp4}<target>${escapedValue}</target>\n` +
          `${sp3}</trans-unit>`
        );
      })
      .join('\n');

    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<xliff version="1.2">\n` +
      `${sp}<file source-language="en" target-language="en">\n` +
      `${sp2}<body>\n` +
      (units ? `${units}\n` : '') +
      `${sp2}</body>\n` +
      `${sp}</file>\n` +
      `</xliff>\n`
    );
  }

  /**
   * Detects whether the given content is an XLIFF translation file.
   *
   * Returns `true` when the content contains an `<xliff` opening tag, which is
   * the unambiguous marker of the XLIFF format.
   *
   * @param content - Raw string content to inspect
   * @returns `true` if the content looks like an XLIFF file
   */
  detect(content: string): boolean {
    return /<xliff[\s>]/.test(content);
  }
}
