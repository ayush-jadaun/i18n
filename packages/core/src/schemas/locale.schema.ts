/**
 * Zod schemas for locale, translation key, status, delivery mode, and slug validation.
 * @module schemas/locale.schema
 */

import { z } from 'zod';
import { isValidLocale } from '../types/locale';
import { isValidTranslationKey, TRANSLATION_STATUSES } from '../types/translation';
import { DELIVERY_MODES } from '../types/delivery';

/**
 * Validates a BCP-47 locale string (e.g., "en", "en-US", "zh-Hans-CN").
 */
export const LocaleSchema = z
  .string()
  .min(1, 'Locale must not be empty')
  .refine(isValidLocale, {
    message: 'Must be a valid BCP-47 locale (e.g., "en", "en-US", "zh-Hans-CN")',
  });

/**
 * Validates a dot-separated translation key (e.g., "auth.login.title").
 */
export const TranslationKeySchema = z
  .string()
  .min(1, 'Translation key must not be empty')
  .refine(isValidTranslationKey, {
    message:
      'Must be a valid dot-separated translation key using alphanumeric characters, underscores, or hyphens',
  });

/**
 * Validates a translation lifecycle status.
 * One of: untranslated, machine_translated, needs_review, reviewed, approved, published.
 */
export const TranslationStatusSchema = z.enum(
  TRANSLATION_STATUSES as [string, ...string[]],
  {
    errorMap: () => ({
      message: `Must be one of: ${TRANSLATION_STATUSES.join(', ')}`,
    }),
  }
);

/**
 * Validates a delivery mode.
 * One of: api, cdn, bundled.
 */
export const DeliveryModeSchema = z.enum(DELIVERY_MODES as [string, ...string[]], {
  errorMap: () => ({
    message: `Must be one of: ${DELIVERY_MODES.join(', ')}`,
  }),
});

/**
 * Validates a URL-safe slug.
 * Must match the pattern: lowercase alphanumerics separated by hyphens.
 * @example "my-project", "acme-inc", "project123"
 */
export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must contain only lowercase alphanumeric characters and hyphens, and must not start or end with a hyphen',
  });
