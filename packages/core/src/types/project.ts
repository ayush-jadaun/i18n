/**
 * Project and project-configuration types for the i18n platform.
 * @module types/project
 */

import type { Locale } from './locale';
import type { DeliveryMode } from './delivery';

/**
 * A localization project belonging to an organization.
 */
export interface Project {
  /** Unique project identifier (UUID) */
  id: string;
  /** ID of the organization that owns this project */
  orgId: string;
  /** Human-readable display name of the project */
  name: string;
  /** URL-safe slug derived from the project name (unique within the org) */
  slug: string;
  /** The source locale from which all translations are derived */
  defaultLocale: Locale;
  /** How translated bundles are delivered to client applications */
  deliveryMode: DeliveryMode;
  /** Project-level configuration */
  settings: ProjectSettings;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-updated timestamp */
  updatedAt: string;
}

/**
 * Configuration that controls project-level automation and quality gates.
 */
export interface ProjectSettings {
  /** Whether to trigger machine translation automatically when source strings are pushed */
  autoTranslateOnPush: boolean;
  /** Whether human review is required before a translation can be approved */
  requireReview: boolean;
  /**
   * Minimum translation coverage percentage (0–100) required before a locale
   * can be published. Defaults to 100 if not specified.
   */
  minCoverageForPublish: number;
}

/**
 * The state of a specific locale within a project.
 */
export interface ProjectLocale {
  /** Unique record identifier (UUID) */
  id: string;
  /** ID of the owning project */
  projectId: string;
  /** BCP-47 locale code (e.g., `"fr"`, `"pt-BR"`) */
  locale: Locale;
  /** Whether this locale is actively maintained and published */
  enabled: boolean;
  /** Percentage of translation keys that have an approved translation (0–100) */
  coveragePercent: number;
  /** ISO 8601 timestamp of the last time this locale was synced with the delivery target */
  lastSyncedAt: string | null;
}

/**
 * A logical grouping of translation keys within a project (e.g., `"common"`, `"auth"`).
 */
export interface Namespace {
  /** Unique namespace identifier (UUID) */
  id: string;
  /** ID of the owning project */
  projectId: string;
  /** Namespace name used as a key prefix or file name */
  name: string;
  /** Optional human-readable description of what this namespace contains */
  description?: string;
  /** Integer used to order namespaces in the UI and output files */
  sortOrder: number;
}

// ---------------------------------------------------------------------------
// Project CLI / SDK configuration
// ---------------------------------------------------------------------------

/**
 * Source-code extraction configuration.
 */
export interface SourceConfig {
  /** Glob patterns of source files to scan for translation keys */
  include: string[];
  /** Glob patterns of paths to exclude from extraction */
  exclude?: string[];
  /** Default namespace assigned to extracted keys that don't declare one */
  defaultNamespace?: string;
}

/**
 * Output file configuration for generated translation bundles.
 */
export interface OutputConfig {
  /** Output directory where translated files are written */
  path: string;
  /**
   * Naming template for output files.
   * Supports tokens: `{{locale}}`, `{{namespace}}`.
   * @example "{{locale}}/{{namespace}}.json"
   */
  filePattern: string;
  /** Whether to sort keys alphabetically in output files */
  sortKeys?: boolean;
}

/**
 * Client-side machine-translation provider configuration.
 */
export interface MachineTranslationClientConfig {
  /** Provider identifier (e.g., `"deepl"`, `"google"`, `"openai"`) */
  provider: string;
  /** API key or token used to authenticate with the provider */
  apiKey: string;
  /** Locales to skip for machine translation (overrides global include list) */
  excludeLocales?: Locale[];
}

/**
 * Validation rules applied to translated strings.
 */
export interface ValidationConfig {
  /** Whether to fail when placeholders present in the source are missing in the translation */
  checkMissingPlaceholders: boolean;
  /** Whether to fail when extra placeholders appear in the translation */
  checkExtraPlaceholders: boolean;
  /** Whether to warn when the translated string is unusually long relative to the source */
  checkLength: boolean;
  /**
   * Multiplier applied to the source string length to derive the maximum allowed
   * translation length. E.g., `2.0` means the translation may be at most twice
   * as long as the source.
   */
  maxLengthMultiplier?: number;
}

/**
 * Full configuration object used by the i18n-platform CLI and SDK clients.
 * Typically stored in `i18n.config.ts` or `i18n.config.json` at the project root.
 */
export interface ProjectConfig {
  /** ID of the project this configuration targets */
  projectId: string;
  /** Base URL of the i18n-platform API */
  apiUrl: string;
  /** API key used to authenticate CLI and SDK requests */
  apiKey: string;
  /** Source locale (must match the project's `defaultLocale`) */
  defaultLocale: Locale;
  /** All locales the project should generate translations for */
  supportedLocales: Locale[];
  /** Namespace names to include in operations (empty array = all) */
  namespaces: string[];
  /** Delivery mode and associated CDN configuration */
  delivery: {
    /** How translation bundles are served to clients */
    mode: DeliveryMode;
    /** CDN base URL used when `mode` is `'cdn'` */
    cdnUrl?: string;
  };
  /** Source-code extraction settings */
  source: SourceConfig;
  /** Output file settings */
  output: OutputConfig;
  /** Optional client-side MT configuration for on-the-fly translation */
  machineTranslation?: MachineTranslationClientConfig;
  /** Optional validation rules applied during push and review */
  validation?: ValidationConfig;
}
