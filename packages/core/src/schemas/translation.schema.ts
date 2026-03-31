/**
 * Zod schemas for translation update, bulk update, key creation, and review operations.
 * @module schemas/translation.schema
 */

import { z } from 'zod';
import { LocaleSchema, TranslationStatusSchema } from './locale.schema';

/**
 * Schema for updating a single translation value.
 */
export const UpdateTranslationSchema = z.object({
  /** The new translated string value */
  value: z.string().min(1, 'Translation value must not be empty'),
  /** Optional new lifecycle status */
  status: TranslationStatusSchema.optional(),
});

/** Inferred TypeScript type for {@link UpdateTranslationSchema}. */
export type UpdateTranslation = z.infer<typeof UpdateTranslationSchema>;

/**
 * Schema for bulk-updating multiple translation entries in a single request.
 */
export const BulkUpdateTranslationsSchema = z.object({
  /** Array of translation updates to apply atomically */
  translations: z
    .array(
      z.object({
        /** UUID of the translation key to update */
        keyId: z.string().uuid('keyId must be a valid UUID'),
        /** BCP-47 locale code for this translation */
        locale: LocaleSchema,
        /** The new translated string value */
        value: z.string().min(1, 'Translation value must not be empty'),
        /** Optional new lifecycle status */
        status: TranslationStatusSchema.optional(),
      })
    )
    .min(1, 'At least one translation must be provided'),
});

/** Inferred TypeScript type for {@link BulkUpdateTranslationsSchema}. */
export type BulkUpdateTranslations = z.infer<typeof BulkUpdateTranslationsSchema>;

/**
 * Schema for creating one or more translation keys in a project.
 */
export const CreateKeysSchema = z.object({
  /** Array of key definitions to create */
  keys: z
    .array(
      z.object({
        /** The dot-separated translation key identifier */
        key: z.string().min(1, 'Key must not be empty'),
        /** Optional source/default value in the project's default locale */
        defaultValue: z.string().optional(),
        /** Optional human-readable description for translators */
        description: z.string().optional(),
        /** Optional namespace to assign this key to */
        namespace: z.string().optional(),
        /** Optional maximum character length constraint for translations */
        maxLength: z.number().positive('maxLength must be a positive number').optional(),
      })
    )
    .min(1, 'At least one key must be provided'),
});

/** Inferred TypeScript type for {@link CreateKeysSchema}. */
export type CreateKeys = z.infer<typeof CreateKeysSchema>;

/**
 * Schema for submitting a review decision on a translation.
 */
export const ReviewTranslationSchema = z.object({
  /** Review decision: approve or reject the translation */
  action: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Action must be "approved" or "rejected"' }),
  }),
  /** Optional reviewer comment explaining the decision */
  comment: z.string().optional(),
});

/** Inferred TypeScript type for {@link ReviewTranslationSchema}. */
export type ReviewTranslation = z.infer<typeof ReviewTranslationSchema>;
