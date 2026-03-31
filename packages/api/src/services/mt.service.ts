/**
 * Machine translation service — business logic for triggering MT jobs
 * and managing MT configuration.
 *
 * Uses the {@link NoOpMtAdapter} from `@i18n-platform/core` as the default
 * provider. Real MT providers (DeepL, Google, etc.) will be wired in later.
 *
 * All functions are stateless and accept a Drizzle `db` instance as the first
 * argument for easy testing with mocks.
 *
 * @module services/mt.service
 */

import type { Database } from '@i18n-platform/database';
import type { IMachineTranslator } from '@i18n-platform/core';
import { NoOpMtAdapter } from '@i18n-platform/core';
import { eq, and } from 'drizzle-orm';
import { mtConfigs, translationKeys, translations } from '@i18n-platform/database';
import * as translationRepo from '../repositories/translation.repository.js';

// ── Default adapter ──────────────────────────────────────────────────────────

/** Default no-op MT adapter used when no real provider is configured. */
const defaultAdapter: IMachineTranslator = new NoOpMtAdapter();

// ── Types ────────────────────────────────────────────────────────────────────

/** Options for triggering a machine translation job. */
export interface TranslateKeysOptions {
  /** BCP-47 target locale to translate into. */
  locale: string;
  /** Optional provider ID override (currently unused, uses NoOp). */
  provider?: string;
  /** Optional subset of key UUIDs to translate (omit for all untranslated). */
  keyIds?: string[];
}

/** Result of a machine translation job. */
export interface TranslateKeysResult {
  /** Number of keys that were translated. */
  translatedCount: number;
  /** The MT provider that was used. */
  providerId: string;
}

// ── Translation ──────────────────────────────────────────────────────────────

/**
 * Translates keys for a project into the specified locale using the MT adapter.
 *
 * If `keyIds` are provided, only those keys are translated. Otherwise, all
 * keys in the project that lack a translation for the target locale are
 * translated.
 *
 * Currently uses the {@link NoOpMtAdapter} which returns empty strings.
 * Real providers will be plugged in based on the project's MT configuration.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @param options - Translation job options.
 * @returns A {@link TranslateKeysResult} with the count and provider ID.
 *
 * @example
 * ```ts
 * const result = await translateKeys(db, projectId, { locale: 'fr' });
 * ```
 */
export async function translateKeys(
  db: Database,
  projectId: string,
  options: TranslateKeysOptions,
): Promise<TranslateKeysResult> {
  const adapter = defaultAdapter;

  // Fetch all keys for the project.
  const allKeys = await db
    .select()
    .from(translationKeys)
    .where(eq(translationKeys.projectId, projectId));

  // Filter to requested key IDs if provided.
  const keysToTranslate = options.keyIds
    ? allKeys.filter((k) => options.keyIds!.includes(k.id))
    : allKeys;

  let translatedCount = 0;

  for (const key of keysToTranslate) {
    // Check if translation already exists.
    const existing = await translationRepo.findByKeyAndLocale(
      db,
      key.id,
      options.locale,
    );
    if (existing && existing.value) continue;

    // Translate the default value.
    const result = await adapter.translate({
      text: key.defaultValue || key.key,
      sourceLocale: 'en',
      targetLocale: options.locale,
    });

    if (result.translatedText) {
      await translationRepo.upsert(db, {
        keyId: key.id,
        locale: options.locale,
        value: result.translatedText,
        status: 'draft',
        translatedBy: `mt:${adapter.providerId}`,
      });
      translatedCount++;
    }
  }

  return {
    translatedCount,
    providerId: adapter.providerId,
  };
}

// ── Configuration ────────────────────────────────────────────────────────────

/**
 * Retrieves the machine translation configuration for a project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @returns Array of MT configuration rows for the project.
 *
 * @example
 * ```ts
 * const configs = await getMtConfig(db, projectId);
 * ```
 */
export async function getMtConfig(db: Database, projectId: string) {
  return db
    .select()
    .from(mtConfigs)
    .where(eq(mtConfigs.projectId, projectId));
}

/**
 * Updates or creates an MT configuration for a project.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project.
 * @param config - MT configuration fields to set.
 * @returns The upserted MT configuration row.
 *
 * @example
 * ```ts
 * const config = await updateMtConfig(db, projectId, {
 *   sourceLocale: 'en',
 *   targetLocale: 'fr',
 *   provider: 'deepl',
 *   enabled: true,
 * });
 * ```
 */
export async function updateMtConfig(
  db: Database,
  projectId: string,
  config: {
    sourceLocale: string;
    targetLocale: string;
    provider: string;
    enabled?: boolean;
    autoTranslate?: boolean;
  },
) {
  const rows = await db
    .insert(mtConfigs)
    .values({
      projectId,
      sourceLocale: config.sourceLocale,
      targetLocale: config.targetLocale,
      provider: config.provider,
      enabled: config.enabled ?? true,
      autoTranslate: config.autoTranslate ?? false,
    })
    .onConflictDoUpdate({
      target: [
        mtConfigs.projectId,
        mtConfigs.sourceLocale,
        mtConfigs.targetLocale,
        mtConfigs.provider,
      ],
      set: {
        enabled: config.enabled ?? true,
        autoTranslate: config.autoTranslate ?? false,
      },
    })
    .returning();

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return rows[0]!;
}
