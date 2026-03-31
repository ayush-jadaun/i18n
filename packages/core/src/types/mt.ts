/**
 * Machine-translation configuration, routing, and result types.
 * @module types/mt
 */

import type { Locale } from './locale';

/**
 * Strategy used to select an MT provider for a given translation request.
 *
 * - `'single'`    — Always use one fixed provider.
 * - `'fallback'`  — Try providers in order; use the next if the current fails.
 * - `'cost'`      — Select the cheapest provider that supports the locale pair.
 * - `'quality'`   — Select the provider with the highest known quality score for the pair.
 * - `'round-robin'` — Distribute requests evenly across all configured providers.
 */
export type MtRoutingStrategy =
  | 'single'
  | 'fallback'
  | 'cost'
  | 'quality'
  | 'round-robin';

/**
 * A single routing rule that maps a locale or namespace pattern to a specific provider.
 */
export interface MtRoutingRule {
  /**
   * Glob or exact locale code that triggers this rule.
   * @example "ja", "zh-*"
   */
  localePattern?: string;
  /**
   * Namespace name or glob that triggers this rule.
   * @example "legal", "marketing-*"
   */
  namespacePattern?: string;
  /** ID of the MT provider to use when this rule matches */
  providerId: string;
  /**
   * Rule priority — lower numbers are evaluated first.
   * Defaults to 100 if omitted.
   */
  priority?: number;
}

/**
 * Routing configuration that determines how MT requests are dispatched.
 */
export interface MtRoutingConfig {
  /** Strategy used to resolve the provider when no specific rule matches */
  strategy: MtRoutingStrategy;
  /** Ordered list of specific routing rules evaluated before the strategy */
  rules: MtRoutingRule[];
  /** ID of the default provider used when no rule matches */
  defaultProviderId: string;
}

/**
 * Criteria for automatically approving machine-translated strings without human review.
 */
export interface MtAutoApproveConfig {
  /** Whether auto-approval is enabled at all */
  enabled: boolean;
  /**
   * Minimum quality score (0–1) required for auto-approval.
   * Strings whose estimated quality falls below this threshold are flagged for review.
   */
  minQualityScore: number;
  /**
   * Locale codes excluded from auto-approval regardless of quality score.
   * @example ["ja", "zh-Hans"]
   */
  excludeLocales?: Locale[];
  /**
   * Namespace names excluded from auto-approval (e.g., legal or marketing copy).
   */
  excludeNamespaces?: string[];
}

/**
 * Spending limits applied to machine-translation jobs.
 */
export interface MtCostLimitsConfig {
  /**
   * Maximum USD spend allowed per translation job.
   * The job is rejected before starting if the estimated cost exceeds this value.
   */
  maxCostPerJob?: number;
  /**
   * Maximum USD spend allowed per calendar month across all MT jobs.
   * New jobs are rejected once this limit is reached.
   */
  maxMonthlyCost?: number;
  /**
   * Whether to send an alert when the monthly spend exceeds this percentage of
   * `maxMonthlyCost`. Value is 0–100.
   */
  alertAtPercent?: number;
}

/**
 * Top-level machine-translation configuration for a project or organization.
 */
export interface MachineTranslationConfig {
  /** Whether machine translation is enabled */
  enabled: boolean;
  /** Provider routing configuration */
  routing: MtRoutingConfig;
  /** Auto-approval settings */
  autoApprove: MtAutoApproveConfig;
  /** Cost limit settings */
  costLimits: MtCostLimitsConfig;
}

// ---------------------------------------------------------------------------
// Request / response types
// ---------------------------------------------------------------------------

/**
 * Parameters for a single string translation request.
 */
export interface TranslateParams {
  /** The text to translate */
  text: string;
  /** BCP-47 source locale */
  sourceLocale: Locale;
  /** BCP-47 target locale */
  targetLocale: Locale;
  /** Optional namespace hint used for context-aware translation or routing */
  namespace?: string;
  /** Optional key hint used for glossary or memory lookups */
  key?: string;
  /** Optional additional context provided to the MT provider */
  context?: string;
}

/**
 * Result of a single string translation request.
 */
export interface TranslateResult {
  /** The translated string */
  translatedText: string;
  /** ID of the provider that produced this translation */
  providerId: string;
  /** Quality score estimated by the provider or a post-processing model (0–1) */
  qualityScore?: number;
  /** Number of characters billed by the provider */
  charactersBilled?: number;
  /** Estimated cost in USD for this translation */
  estimatedCostUsd?: number;
}

/**
 * Parameters for a batch translation request.
 */
export interface TranslateBatchParams {
  /**
   * Items to translate. Each item maps a key to its source text.
   */
  items: Array<{
    /** Translation key, used to correlate results */
    key: string;
    /** Source text to translate */
    text: string;
    /** Optional namespace for this specific item */
    namespace?: string;
    /** Optional additional context for this specific item */
    context?: string;
  }>;
  /** BCP-47 source locale applied to all items */
  sourceLocale: Locale;
  /** BCP-47 target locale applied to all items */
  targetLocale: Locale;
}

/**
 * Result of a batch translation request.
 */
export interface TranslateBatchResult {
  /**
   * Translated results keyed by the original item key.
   */
  results: Record<
    string,
    {
      /** The translated string, or `null` if translation failed for this item */
      translatedText: string | null;
      /** Per-item error message if translation failed */
      error?: string;
      /** Quality score estimated by the provider (0–1) */
      qualityScore?: number;
    }
  >;
  /** ID of the provider that processed the batch */
  providerId: string;
  /** Total number of characters billed across all items */
  totalCharactersBilled: number;
  /** Total estimated cost in USD for the batch */
  totalEstimatedCostUsd: number;
}

/**
 * Cost estimate returned before a translation job is executed.
 */
export interface CostEstimate {
  /** ID of the provider this estimate applies to */
  providerId: string;
  /** Number of characters to be billed */
  characterCount: number;
  /** Estimated cost in USD */
  estimatedCostUsd: number;
  /** Currency code (always `"USD"` in the current implementation) */
  currency: string;
}

/**
 * Quality score for a translated string, produced by a QE model or provider.
 */
export interface MtQualityScore {
  /** The translation key this score applies to */
  key: string;
  /** BCP-47 locale of the translation */
  locale: Locale;
  /**
   * Overall quality score in the range [0, 1].
   * 1.0 = perfect, 0.0 = unusable.
   */
  score: number;
  /**
   * Optional per-dimension breakdown.
   * Keys are dimension names (e.g., `"fluency"`, `"adequacy"`).
   */
  dimensions?: Record<string, number>;
  /** ID of the model or service that produced this score */
  scorerId: string;
  /** ISO 8601 timestamp when the score was computed */
  scoredAt: string;
}
