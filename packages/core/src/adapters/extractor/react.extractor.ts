/**
 * React i18n key extractor.
 *
 * Scans `.tsx`, `.jsx`, `.ts`, and `.js` source files for `t()` calls and
 * `useTranslation()` hooks, extracting translation keys, default values, and
 * namespace information using regular expressions.
 *
 * Patterns recognised:
 * - `t('key')` / `t("key")`
 * - `t('key', 'default value')` / `t("key", "default value")`
 * - `t('key', { defaultValue: 'text' })` / `t("key", { defaultValue: "text" })`
 * - `useTranslation('namespace')` — infers the namespace for all `t()` calls
 *   in the same file
 *
 * Dynamic keys (variables, template literals) are reported as warnings rather
 * than extracted keys.
 *
 * @module adapters/extractor/react
 */

import { promises as fs } from 'fs';
import type {
  IKeyExtractor,
  ExtractedKey,
  ExtractionResult,
  ExtractionWarning,
} from '../../interfaces/key-extractor';

/**
 * Regex that matches `useTranslation('ns')` or `useTranslation("ns")`.
 *
 * Capture group 1: the opening quote character.
 * Capture group 2: the namespace string value.
 *
 * @internal
 */
const USE_TRANSLATION_RE = /useTranslation\(\s*(['"])([^'"]+)\1\s*\)/g;

/**
 * Regex that matches `t(` followed by a static single- or double-quoted string
 * key (group 2), with optional trailing argument text (group 3) up to a
 * closing paren (not consumed).
 *
 * @internal
 */
const T_STATIC_RE = /\bt\(\s*(['"])((?:[^'"\\]|\\.)*)\1([^)]*)\)/g;

/**
 * Regex that detects a `t(` call where the first argument is a template literal
 * containing a `${` expression — i.e., a dynamic key.
 *
 * @internal
 */
const T_TEMPLATE_DYNAMIC_RE = /\bt\(\s*`[^`]*\$\{/g;

/**
 * Regex that detects a `t(` call where the first argument is a bare identifier
 * or expression (not a quoted string or template literal) — a dynamic key.
 *
 * @internal
 */
const T_VARIABLE_RE = /\bt\(\s*([A-Za-z_$][A-Za-z0-9_$.]*)\s*[,)]/g;

/**
 * Regex for the `{ defaultValue: '...' }` pattern inside a `t()` call.
 *
 * Capture group 1: the opening quote.
 * Capture group 2: the default value string.
 *
 * @internal
 */
const DEFAULT_VALUE_OBJ_RE = /defaultValue\s*:\s*(['"])((?:[^'"\\]|\\.)*)\1/;

/**
 * Regex for a plain string second argument: `t('key', 'default')`.
 *
 * Applied to the trailing argument text after the key.
 * Capture group 1: the opening quote.
 * Capture group 2: the default value string.
 *
 * @internal
 */
const DEFAULT_VALUE_STR_RE = /^\s*,\s*(['"])((?:[^'"\\]|\\.)*)\1/;

/**
 * Computes the 1-based line number and column for a character offset within a
 * string.
 *
 * @param source - Full source text
 * @param offset - Character offset to locate
 * @returns `{ line, column }` both 1-based
 * @internal
 */
function lineColumnAt(
  source: string,
  offset: number,
): { line: number; column: number } {
  const before = source.slice(0, offset);
  const lines = before.split('\n');
  const line = lines.length;
  const column = (lines[lines.length - 1]?.length ?? 0) + 1;
  return { line, column };
}

/**
 * Extracts translation keys from a single React/TypeScript source file.
 *
 * @param filePath - Absolute path of the source file to scan
 * @param source - Full text content of the file
 * @returns Extracted keys and any warnings encountered
 * @internal
 */
function extractFromSource(
  filePath: string,
  source: string,
): { keys: ExtractedKey[]; warnings: ExtractionWarning[] } {
  const keys: ExtractedKey[] = [];
  const warnings: ExtractionWarning[] = [];

  // ------------------------------------------------------------------
  // 1. Detect namespace from useTranslation('ns') — use the last match
  //    so that the most-recently-declared hook wins.
  // ------------------------------------------------------------------
  let namespace: string | undefined;
  USE_TRANSLATION_RE.lastIndex = 0;
  let nsMatch: RegExpExecArray | null;
  while ((nsMatch = USE_TRANSLATION_RE.exec(source)) !== null) {
    namespace = nsMatch[2];
  }

  // ------------------------------------------------------------------
  // 2. Collect offsets of dynamic template-literal calls so they can be
  //    warned about and skipped during static extraction.
  // ------------------------------------------------------------------
  const dynamicOffsets = new Set<number>();

  T_TEMPLATE_DYNAMIC_RE.lastIndex = 0;
  let tmplMatch: RegExpExecArray | null;
  while ((tmplMatch = T_TEMPLATE_DYNAMIC_RE.exec(source)) !== null) {
    const { line } = lineColumnAt(source, tmplMatch.index);
    warnings.push({
      message: `Dynamic key detected (template literal with expression) at line ${line}`,
      filePath,
      line,
    });
    dynamicOffsets.add(tmplMatch.index);
  }

  // ------------------------------------------------------------------
  // 3. Collect offsets of dynamic variable calls.
  // ------------------------------------------------------------------
  T_VARIABLE_RE.lastIndex = 0;
  let varMatch: RegExpExecArray | null;
  while ((varMatch = T_VARIABLE_RE.exec(source)) !== null) {
    const { line } = lineColumnAt(source, varMatch.index);
    warnings.push({
      message: `Dynamic key detected (variable): t(${varMatch[1]})`,
      filePath,
      line,
    });
    dynamicOffsets.add(varMatch.index);
  }

  // ------------------------------------------------------------------
  // 4. Extract static-key t() calls, skipping any that overlap with
  //    dynamic call positions.
  // ------------------------------------------------------------------
  T_STATIC_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = T_STATIC_RE.exec(source)) !== null) {
    // Skip if this position was already covered by a dynamic-key warning.
    if (dynamicOffsets.has(match.index)) {
      continue;
    }

    const staticKey = match[2];
    const trailingArgs = match[3] ?? '';

    const { line, column } = lineColumnAt(source, match.index);

    let defaultValue: string | undefined;

    // Check for string default: t('key', 'default')
    const strDefault = DEFAULT_VALUE_STR_RE.exec(trailingArgs);
    if (strDefault) {
      defaultValue = strDefault[2];
    } else {
      // Check for object default: t('key', { defaultValue: 'text' })
      const objDefault = DEFAULT_VALUE_OBJ_RE.exec(trailingArgs);
      if (objDefault) {
        defaultValue = objDefault[2];
      }
    }

    keys.push({
      key: staticKey,
      filePath,
      line,
      column,
      ...(defaultValue !== undefined ? { defaultValue } : {}),
      ...(namespace !== undefined ? { namespace } : {}),
    });
  }

  return { keys, warnings };
}

/**
 * Key extractor for React applications using the `react-i18next` pattern.
 *
 * Reads each provided source file and uses regular expressions to locate
 * `t()` calls and `useTranslation()` declarations.  The extractor is
 * stateless and safe for concurrent use.
 *
 * @example
 * ```ts
 * const extractor = new ReactExtractor();
 * const result = await extractor.extract([
 *   '/app/src/pages/Login.tsx',
 *   '/app/src/components/Header.tsx',
 * ]);
 * console.log(result.keys);     // ExtractedKey[]
 * console.log(result.warnings); // ExtractionWarning[]
 * ```
 */
export class ReactExtractor implements IKeyExtractor {
  /** @inheritdoc */
  readonly extractorId = 'react';

  /** @inheritdoc */
  readonly supportedFileTypes: readonly string[] = ['.tsx', '.jsx', '.ts', '.js'];

  /**
   * Scans the given source files for React i18n key usages.
   *
   * Each file is read from disk and searched for `t()` calls and
   * `useTranslation()` declarations.  Files that cannot be read are skipped
   * with a warning rather than throwing.
   *
   * @param filePaths - Absolute paths of the files to scan
   * @returns Aggregated extraction results across all files
   */
  async extract(filePaths: string[]): Promise<ExtractionResult> {
    const allKeys: ExtractedKey[] = [];
    const allWarnings: ExtractionWarning[] = [];

    for (const filePath of filePaths) {
      let source: string;
      try {
        source = await fs.readFile(filePath, 'utf-8');
      } catch (err) {
        allWarnings.push({
          message: `Failed to read file: ${(err as Error).message}`,
          filePath,
          line: null,
        });
        continue;
      }

      const { keys, warnings } = extractFromSource(filePath, source);
      allKeys.push(...keys);
      allWarnings.push(...warnings);
    }

    return { keys: allKeys, warnings: allWarnings };
  }
}
