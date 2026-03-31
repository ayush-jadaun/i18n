/**
 * Zod schemas for project creation, update, and CLI configuration.
 * @module schemas/project.schema
 */

import { z } from 'zod';
import { LocaleSchema, DeliveryModeSchema, SlugSchema } from './locale.schema';

/** Reusable project settings sub-schema. */
const ProjectSettingsSchema = z.object({
  /** Whether to auto-trigger MT when source strings are pushed */
  autoTranslateOnPush: z.boolean(),
  /** Whether human review is required before approval */
  requireReview: z.boolean(),
  /**
   * Minimum translation coverage percentage (0–100) required for publishing.
   */
  minCoverageForPublish: z.number().min(0).max(100),
});

/**
 * Schema for creating a new project.
 */
export const CreateProjectSchema = z.object({
  /** Human-readable display name of the project */
  name: z.string().min(1, 'Project name must not be empty'),
  /** URL-safe slug (unique within the org) */
  slug: SlugSchema,
  /** BCP-47 source locale from which all translations are derived */
  defaultLocale: LocaleSchema,
  /** All BCP-47 locales the project will produce translations for */
  supportedLocales: z.array(LocaleSchema).min(1, 'At least one supported locale is required'),
  /** How translation bundles are delivered to client applications */
  delivery: DeliveryModeSchema,
  /** Optional project-level automation and quality settings */
  settings: ProjectSettingsSchema.optional(),
});

/** Inferred TypeScript type for {@link CreateProjectSchema}. */
export type CreateProject = z.infer<typeof CreateProjectSchema>;

/**
 * Schema for partially updating an existing project.
 * All fields are optional.
 */
export const UpdateProjectSchema = CreateProjectSchema.partial();

/** Inferred TypeScript type for {@link UpdateProjectSchema}. */
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

/** Reusable source config sub-schema. */
const SourceConfigSchema = z.object({
  /** Glob patterns of source files to scan for translation keys */
  include: z.array(z.string()).min(1, 'At least one include pattern is required'),
  /** Glob patterns of paths to exclude from extraction */
  exclude: z.array(z.string()).optional(),
  /** Default namespace assigned to extracted keys that don't declare one */
  defaultNamespace: z.string().optional(),
});

/** Reusable output config sub-schema. */
const OutputConfigSchema = z.object({
  /** Output directory where translated files are written */
  path: z.string().min(1, 'Output path must not be empty'),
  /**
   * Naming template for output files.
   * Supports tokens: {{locale}}, {{namespace}}.
   */
  filePattern: z.string().min(1, 'File pattern must not be empty'),
  /** Whether to sort keys alphabetically in output files */
  sortKeys: z.boolean().optional(),
});

/** Reusable validation config sub-schema. */
const ValidationConfigSchema = z.object({
  /** Whether to fail when source placeholders are missing in the translation */
  checkMissingPlaceholders: z.boolean(),
  /** Whether to fail when extra placeholders appear in the translation */
  checkExtraPlaceholders: z.boolean(),
  /** Whether to warn when the translation is unusually long */
  checkLength: z.boolean(),
  /** Multiplier applied to source length to derive max allowed translation length */
  maxLengthMultiplier: z.number().positive().optional(),
});

/** Reusable machine-translation client config sub-schema. */
const MachineTranslationClientConfigSchema = z.object({
  /** Provider identifier (e.g., "deepl", "google", "openai") */
  provider: z.string().min(1, 'Provider must not be empty'),
  /** API key or token used to authenticate with the provider */
  apiKey: z.string().min(1, 'API key must not be empty'),
  /** Locales to skip for machine translation */
  excludeLocales: z.array(LocaleSchema).optional(),
});

/**
 * Schema for the full CLI/SDK project configuration file.
 * Typically stored in `i18n.config.ts` or `i18n.config.json`.
 */
export const ProjectConfigSchema = z.object({
  /** UUID of the project this configuration targets */
  projectId: z.string().uuid('projectId must be a valid UUID'),
  /** Base URL of the i18n-platform API */
  apiUrl: z.string().url('apiUrl must be a valid URL'),
  /** API key used to authenticate CLI and SDK requests */
  apiKey: z.string().min(1, 'apiKey must not be empty'),
  /** Source locale (must match the project's defaultLocale) */
  defaultLocale: LocaleSchema,
  /** All locales the project should generate translations for */
  supportedLocales: z.array(LocaleSchema).min(1, 'At least one supported locale is required'),
  /** Namespace names to include in operations (empty array = all) */
  namespaces: z.array(z.string()),
  /** Delivery mode and optional CDN configuration */
  delivery: z.object({
    /** How translation bundles are served to clients */
    mode: DeliveryModeSchema,
    /** CDN base URL used when mode is "cdn" */
    cdnUrl: z.string().url().optional(),
  }),
  /** Source-code extraction settings */
  source: SourceConfigSchema,
  /** Output file settings */
  output: OutputConfigSchema,
  /** Optional client-side MT configuration */
  machineTranslation: MachineTranslationClientConfigSchema.optional(),
  /** Optional validation rules applied during push and review */
  validation: ValidationConfigSchema.optional(),
});

/** Inferred TypeScript type for {@link ProjectConfigSchema}. */
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
