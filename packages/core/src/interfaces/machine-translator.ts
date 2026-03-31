/**
 * Machine translator adapter interface.
 *
 * Implement this interface to integrate a machine-translation provider
 * (e.g., DeepL, Google Translate, Amazon Translate, OpenAI).
 *
 * @module interfaces/machine-translator
 */

import type { Locale } from '../types';
import type {
  TranslateParams,
  TranslateResult,
  TranslateBatchParams,
  TranslateBatchResult,
  CostEstimate,
} from '../types';

/**
 * Adapter for a machine-translation provider.
 *
 * Implementations should be stateless with respect to individual translation
 * requests — the same instance may handle concurrent calls.
 *
 * @example
 * ```ts
 * class DeepLTranslator implements IMachineTranslator {
 *   readonly providerId = 'deepl';
 *   readonly supportedLocales = ['en', 'de', 'fr', 'ja', 'zh'];
 *
 *   async translate(params: TranslateParams): Promise<TranslateResult> {
 *     // ... call DeepL API
 *   }
 * }
 * ```
 */
export interface IMachineTranslator {
  /**
   * Unique identifier for this MT provider.
   * @example "deepl", "google", "amazon", "openai"
   */
  readonly providerId: string;

  /**
   * BCP-47 locale codes this provider can translate to or from.
   * An empty array means the provider claims support for all locales.
   */
  readonly supportedLocales: readonly Locale[];

  /**
   * Translates a single string.
   *
   * @param params - Source text, source locale, and target locale
   * @returns The translated text and associated metadata
   * @throws {Error} If translation fails or the locale pair is unsupported
   */
  translate(params: TranslateParams): Promise<TranslateResult>;

  /**
   * Translates multiple strings in a single API call.
   *
   * Implementations should send items as a single batched request to the
   * provider where possible to reduce latency and cost.
   *
   * @param params - Batch of items to translate, source locale, and target locale
   * @returns Results keyed by item key, plus aggregate billing information
   * @throws {Error} If the batch request fails at the provider level
   */
  translateBatch(params: TranslateBatchParams): Promise<TranslateBatchResult>;

  /**
   * Detects the language of the provided text.
   *
   * This method is optional — providers that do not support language detection
   * may omit it.
   *
   * @param text - The text whose language should be detected
   * @returns The detected BCP-47 locale code, or `null` if detection fails
   */
  detectLanguage?(text: string): Promise<Locale | null>;

  /**
   * Estimates the cost of translating the given text without performing the translation.
   *
   * This method is optional — providers that do not support cost estimation
   * may omit it.
   *
   * @param params - Source text, source locale, and target locale
   * @returns A cost estimate object
   */
  estimateCost?(params: TranslateParams): Promise<CostEstimate>;
}
