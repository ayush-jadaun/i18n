/**
 * Zod schemas for file import and export operations.
 * @module schemas/import-export.schema
 */

import { z } from 'zod';
import { LocaleSchema, TranslationStatusSchema } from './locale.schema';

/**
 * All supported translation file format identifiers.
 */
export const FORMAT_IDS = [
  'json',
  'flat-json',
  'yaml',
  'csv',
  'xliff',
  'po',
  'android-xml',
  'apple-strings',
] as const;

/** Union type of all valid format IDs. */
export type FormatId = (typeof FORMAT_IDS)[number];

/** Valid conflict resolution strategies for import operations. */
const CONFLICT_STRATEGIES = ['overwrite', 'skip', 'error'] as const;

/**
 * Schema for importing a translation file into a project.
 */
export const ImportFileSchema = z.object({
  /** BCP-47 locale the imported translations are for */
  locale: LocaleSchema,
  /** Format of the file being imported */
  format: z.enum(FORMAT_IDS, {
    errorMap: () => ({
      message: `Format must be one of: ${FORMAT_IDS.join(', ')}`,
    }),
  }),
  /** Raw file content as a string */
  content: z.string().min(1, 'File content must not be empty'),
  /** Optional namespace to assign imported keys to */
  namespace: z.string().optional(),
  /**
   * Strategy to use when an imported key already exists in the project.
   * - `'overwrite'` — replace the existing value
   * - `'skip'` — keep the existing value and ignore the import value
   * - `'error'` — abort the import and return an error
   */
  conflictStrategy: z.enum(CONFLICT_STRATEGIES, {
    errorMap: () => ({
      message: `conflictStrategy must be one of: ${CONFLICT_STRATEGIES.join(', ')}`,
    }),
  }),
});

/** Inferred TypeScript type for {@link ImportFileSchema}. */
export type ImportFile = z.infer<typeof ImportFileSchema>;

/**
 * Schema for querying a translation export.
 */
export const ExportQuerySchema = z.object({
  /** Optional BCP-47 locale to filter exported translations (omit for all locales) */
  locale: LocaleSchema.optional(),
  /** Output format for the exported file */
  format: z.enum(FORMAT_IDS, {
    errorMap: () => ({
      message: `Format must be one of: ${FORMAT_IDS.join(', ')}`,
    }),
  }),
  /** Optional namespace to restrict the export to */
  namespace: z.string().optional(),
  /** Optional list of translation statuses to include in the export */
  statusFilter: z.array(TranslationStatusSchema).optional(),
});

/** Inferred TypeScript type for {@link ExportQuerySchema}. */
export type ExportQuery = z.infer<typeof ExportQuerySchema>;
