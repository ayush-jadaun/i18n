/**
 * Vanilla JS / TypeScript i18n key extractor.
 *
 * Scans `.ts`, `.js`, `.mjs`, and `.cjs` source files for `i18n.t()` calls,
 * extracting translation keys with file/line/column information using regular
 * expressions.
 *
 * Patterns recognised:
 * - `i18n.t('key')` / `i18n.t("key")`
 *
 * Dynamic keys (variables, template literals with expressions) are reported
 * as warnings rather than extracted keys.
 *
 * @module adapters/extractor/vanilla-js
 */

import { promises as fs } from 'fs';
import type {
  IKeyExtractor,
  ExtractedKey,
  ExtractionResult,
  ExtractionWarning,
} from '../../interfaces/key-extractor';

/**
 * Regex that matches `i18n.t(...)` calls.
 *
 * Capture groups:
 * 1. Opening quote character if first argument is a static string literal.
 * 2. Key string value for static string literals.
 * 3. Template literal with `${...}` expression (dynamic).
 * 4. Bare variable/expression argument (dynamic).
 *
 * @internal
 */
const I18N_T_CALL_RE =
  /\bi18n\.t\(\s*(?:(['"])((?:[^'"\\]|\\.)*)\1|(`[^`]*\$\{[^`]*`)|([^'"`)\s][^)]*)\s*)\)/g;

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
 * Extracts translation keys from a single vanilla JS/TS source file.
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

  I18N_T_CALL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = I18N_T_CALL_RE.exec(source)) !== null) {
    const fullMatch = match[0];
    const matchStart = match.index;

    // Groups:
    //  match[1] — opening quote for static key
    //  match[2] — key string value (static)
    //  match[3] — template literal with expression (dynamic)
    //  match[4] — bare variable/expression (dynamic)

    const staticKey = match[2];
    const templateLiteral = match[3];
    const dynamicArg = match[4];

    if (templateLiteral !== undefined) {
      const { line } = lineColumnAt(source, matchStart);
      warnings.push({
        message: `Dynamic key detected (template literal): ${fullMatch.trim()}`,
        filePath,
        line,
      });
      continue;
    }

    if (dynamicArg !== undefined) {
      const { line } = lineColumnAt(source, matchStart);
      warnings.push({
        message: `Dynamic key detected (variable): ${fullMatch.trim()}`,
        filePath,
        line,
      });
      continue;
    }

    if (staticKey === undefined) {
      continue;
    }

    const { line, column } = lineColumnAt(source, matchStart);
    keys.push({ key: staticKey, filePath, line, column });
  }

  return { keys, warnings };
}

/**
 * Key extractor for vanilla JavaScript and TypeScript codebases that use an
 * `i18n.t('key')` translation pattern.
 *
 * Reads each provided source file and uses regular expressions to locate
 * `i18n.t()` calls.  The extractor is stateless and safe for concurrent use.
 *
 * @example
 * ```ts
 * const extractor = new VanillaJsExtractor();
 * const result = await extractor.extract([
 *   '/app/src/utils/format.ts',
 *   '/app/src/main.js',
 * ]);
 * console.log(result.keys);     // ExtractedKey[]
 * console.log(result.warnings); // ExtractionWarning[]
 * ```
 */
export class VanillaJsExtractor implements IKeyExtractor {
  /** @inheritdoc */
  readonly extractorId = 'vanilla-js';

  /** @inheritdoc */
  readonly supportedFileTypes: readonly string[] = ['.ts', '.js', '.mjs', '.cjs'];

  /**
   * Scans the given source files for `i18n.t()` key usages.
   *
   * Each file is read from disk and searched with a regular expression.
   * Files that cannot be read are skipped with a warning rather than
   * throwing.
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
