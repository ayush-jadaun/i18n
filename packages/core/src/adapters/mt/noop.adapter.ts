/**
 * No-op machine translation adapter.
 *
 * Returns empty / zero-cost results for all operations without contacting any
 * external translation provider.  This adapter is intended for use when
 * machine translation is disabled in the project configuration, allowing the
 * rest of the system to operate without special-casing a missing provider.
 *
 * @module adapters/mt/noop
 */

import type { IMachineTranslator } from '../../interfaces/machine-translator';
import type {
  TranslateParams,
  TranslateResult,
  TranslateBatchParams,
  TranslateBatchResult,
  CostEstimate,
} from '../../types';

/**
 * Machine translation adapter that performs no translation.
 *
 * All translation methods return immediately with empty strings and zero
 * usage figures.  `translateBatch` returns an empty results map regardless
 * of how many items are in the request.
 *
 * @example
 * ```ts
 * // Wire up the NoOp adapter when MT is disabled
 * const mtAdapter: IMachineTranslator = config.mt.enabled
 *   ? new DeepLTranslator(config.deepl)
 *   : new NoOpMtAdapter();
 * ```
 */
export class NoOpMtAdapter implements IMachineTranslator {
  /** @inheritdoc */
  readonly providerId = 'noop';

  /**
   * Empty locale list.
   *
   * The no-op adapter accepts any locale pair — returning an empty array
   * signals to callers that no locale filtering should be applied.
   *
   * @inheritdoc
   */
  readonly supportedLocales: readonly string[] = [];

  /**
   * Returns a zeroed-out translation result without performing any translation.
   *
   * @param _params - Ignored translation parameters
   * @returns A result with an empty `translatedText` and zero billing figures
   */
  async translate(_params: TranslateParams): Promise<TranslateResult> {
    return {
      translatedText: '',
      providerId: 'noop',
      charactersBilled: 0,
      estimatedCostUsd: 0,
    };
  }

  /**
   * Returns an empty batch result without performing any translation.
   *
   * The `results` map will always be empty, regardless of how many items
   * were in the request.
   *
   * @param _params - Ignored batch translation parameters
   * @returns A result with an empty `results` map and zero billing totals
   */
  async translateBatch(_params: TranslateBatchParams): Promise<TranslateBatchResult> {
    return {
      results: {},
      providerId: 'noop',
      totalCharactersBilled: 0,
      totalEstimatedCostUsd: 0,
    };
  }

  /**
   * Returns a zero-cost estimate without contacting any provider.
   *
   * @param _params - Ignored translation parameters
   * @returns A cost estimate of zero USD
   */
  async estimateCost(_params: TranslateParams): Promise<CostEstimate> {
    return {
      providerId: 'noop',
      characterCount: 0,
      estimatedCostUsd: 0,
      currency: 'USD',
    };
  }
}
