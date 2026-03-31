/**
 * Key extractor interface for scanning source code and extracting i18n keys.
 *
 * Implement this interface to add support for extracting translation keys from
 * a new framework or library (e.g., react-i18next, vue-i18n, angular/localize).
 *
 * @module interfaces/key-extractor
 */

/**
 * A single translation key discovered in source code.
 */
export interface ExtractedKey {
  /** The translation key string (e.g., `"auth.login.title"`) */
  key: string;
  /**
   * Default value found alongside the key in source, if any.
   * @example "Sign in to your account"
   */
  defaultValue?: string;
  /**
   * The namespace the key belongs to, if declared at the call site.
   * Falls back to the project's default namespace if absent.
   */
  namespace?: string;
  /** Absolute path of the source file where the key was found */
  filePath: string;
  /** 1-based line number of the key occurrence */
  line: number;
  /** 1-based column number of the key occurrence */
  column: number;
}

/**
 * A non-fatal warning raised during extraction (e.g., dynamic key, unparseable call).
 */
export interface ExtractionWarning {
  /** Human-readable description of the problem */
  message: string;
  /** Absolute path of the file that triggered the warning */
  filePath: string;
  /** 1-based line number where the issue was detected, or `null` if unknown */
  line: number | null;
}

/**
 * The result of an extraction run over one or more source files.
 */
export interface ExtractionResult {
  /** All translation keys discovered during the run */
  keys: ExtractedKey[];
  /**
   * Non-fatal warnings raised during extraction.
   * Presence of warnings does not indicate failure.
   */
  warnings: ExtractionWarning[];
}

/**
 * Adapter that scans source files and extracts translation key usages.
 *
 * @example
 * ```ts
 * class ReactI18nextExtractor implements IKeyExtractor {
 *   readonly extractorId = 'react-i18next';
 *   readonly supportedFileTypes = ['.tsx', '.ts', '.jsx', '.js'];
 *
 *   async extract(filePaths: string[]): Promise<ExtractionResult> {
 *     // parse ASTs and find useTranslation / t() calls
 *   }
 * }
 * ```
 */
export interface IKeyExtractor {
  /**
   * Unique identifier for this extractor.
   * @example "react-i18next", "vue-i18n", "angular-localize"
   */
  readonly extractorId: string;

  /**
   * File extensions this extractor is able to process (including the leading dot).
   * @example [".ts", ".tsx", ".js", ".jsx"]
   */
  readonly supportedFileTypes: readonly string[];

  /**
   * Scans the given source files and returns all discovered translation keys.
   *
   * @param filePaths - Absolute paths of the files to scan
   * @returns Extraction results including discovered keys and any warnings
   * @throws {Error} If extraction fails due to an unrecoverable error
   */
  extract(filePaths: string[]): Promise<ExtractionResult>;
}
