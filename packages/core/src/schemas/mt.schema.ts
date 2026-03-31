/**
 * Zod schemas for machine-translation configuration and job triggering.
 * @module schemas/mt.schema
 */

import { z } from 'zod';
import { LocaleSchema } from './locale.schema';

/** All valid MT routing strategies. */
const MT_ROUTING_STRATEGIES = ['single', 'fallback', 'cost', 'quality', 'round-robin'] as const;

/** Schema for a single MT routing rule. */
const MtRoutingRuleSchema = z.object({
  /**
   * Glob or exact locale code that triggers this rule.
   * @example "ja", "zh-*"
   */
  localePattern: z.string().optional(),
  /**
   * Namespace name or glob that triggers this rule.
   * @example "legal", "marketing-*"
   */
  namespacePattern: z.string().optional(),
  /** ID of the MT provider to use when this rule matches */
  providerId: z.string().min(1, 'providerId must not be empty'),
  /**
   * Rule priority — lower numbers are evaluated first.
   * Defaults to 100 if omitted.
   */
  priority: z.number().int().optional(),
});

/** Schema for the MT routing configuration block. */
const MtRoutingConfigSchema = z.object({
  /** Strategy used when no specific rule matches */
  strategy: z.enum(MT_ROUTING_STRATEGIES, {
    errorMap: () => ({
      message: `Strategy must be one of: ${MT_ROUTING_STRATEGIES.join(', ')}`,
    }),
  }),
  /** Ordered list of routing rules evaluated before the strategy */
  rules: z.array(MtRoutingRuleSchema),
  /** ID of the default provider used when no rule matches */
  defaultProviderId: z.string().min(1, 'defaultProviderId must not be empty'),
});

/** Schema for the MT auto-approve configuration block. */
const MtAutoApproveConfigSchema = z.object({
  /** Whether auto-approval is enabled */
  enabled: z.boolean(),
  /**
   * Minimum quality score (0–1) required for auto-approval.
   * Values outside [0, 1] are rejected.
   */
  minQualityScore: z
    .number()
    .min(0, 'minQualityScore must be >= 0')
    .max(1, 'minQualityScore must be <= 1'),
  /** Locale codes excluded from auto-approval regardless of quality score */
  excludeLocales: z.array(LocaleSchema).optional(),
  /** Namespace names excluded from auto-approval */
  excludeNamespaces: z.array(z.string()).optional(),
});

/** Schema for the MT cost limits configuration block. */
const MtCostLimitsConfigSchema = z.object({
  /** Maximum USD spend per translation job */
  maxCostPerJob: z.number().positive().optional(),
  /** Maximum USD spend per calendar month */
  maxMonthlyCost: z.number().positive().optional(),
  /** Alert threshold as a percentage (0–100) of maxMonthlyCost */
  alertAtPercent: z.number().min(0).max(100).optional(),
});

/**
 * Schema for the full machine-translation configuration of a project.
 */
export const MachineTranslationConfigSchema = z.object({
  /** Whether machine translation is enabled for this project */
  enabled: z.boolean(),
  /** Provider routing configuration */
  routing: MtRoutingConfigSchema,
  /** Auto-approval criteria for machine-translated strings */
  autoApprove: MtAutoApproveConfigSchema,
  /** Spending limits applied to MT jobs */
  costLimits: MtCostLimitsConfigSchema,
});

/** Inferred TypeScript type for {@link MachineTranslationConfigSchema}. */
export type MachineTranslationConfig = z.infer<typeof MachineTranslationConfigSchema>;

/**
 * Schema for triggering a machine-translation job for a specific locale.
 */
export const TriggerMtSchema = z.object({
  /** BCP-47 target locale to translate into */
  locale: LocaleSchema,
  /** Optional specific provider to use (overrides routing config) */
  provider: z.string().optional(),
  /** Optional subset of key UUIDs to translate (omit to translate all untranslated keys) */
  keyIds: z.array(z.string().uuid('Each keyId must be a valid UUID')).optional(),
});

/** Inferred TypeScript type for {@link TriggerMtSchema}. */
export type TriggerMt = z.infer<typeof TriggerMtSchema>;
