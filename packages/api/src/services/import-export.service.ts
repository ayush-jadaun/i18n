/**
 * Import/export service — business logic for importing and exporting
 * translation files in various formats.
 *
 * Uses format adapters from `@i18n-platform/core` to parse and serialize
 * translation data. All functions are stateless and accept a Drizzle `db`
 * instance as the first argument for easy testing with mocks.
 *
 * @module services/import-export.service
 */

import type { Database } from '@i18n-platform/database';
import type { IFormatAdapter } from '@i18n-platform/core';
import type { FormatId } from '@i18n-platform/core';
import {
  JsonFlatAdapter,
  JsonNestedAdapter,
  YamlAdapter,
  PoAdapter,
  XliffAdapter,
  AndroidXmlAdapter,
  IosStringsAdapter,
} from '@i18n-platform/core';
import * as keyRepo from '../repositories/key.repository.js';
import * as translationRepo from '../repositories/translation.repository.js';

// ── Format adapter registry ──────────────────────────────────────────────────

/** Map of format IDs to their adapter instances. */
const FORMAT_ADAPTERS: Record<string, IFormatAdapter> = {
  'flat-json': new JsonFlatAdapter(),
  json: new JsonNestedAdapter(),
  yaml: new YamlAdapter(),
  po: new PoAdapter(),
  xliff: new XliffAdapter(),
  'android-xml': new AndroidXmlAdapter(),
  'apple-strings': new IosStringsAdapter(),
};

/**
 * Resolves a format ID to its corresponding adapter instance.
 *
 * @param format - One of the supported format identifiers.
 * @returns The format adapter for the given format ID.
 * @throws {Error} When the format ID is not recognised.
 */
function getAdapter(format: string): IFormatAdapter {
  const adapter = FORMAT_ADAPTERS[format];
  if (!adapter) {
    throw new Error(`Unsupported format: ${format}`);
  }
  return adapter;
}

// ── Types ────────────────────────────────────────────────────────────────────

/** Options for the import operation. */
export interface ImportOptions {
  /** BCP-47 locale the imported translations belong to. */
  locale: string;
  /** Format of the input content. */
  format: FormatId;
  /** Raw file content as a string. */
  content: string;
  /** Optional namespace to assign imported keys to. */
  namespace?: string;
  /** Strategy for handling keys that already have a translation. */
  conflictStrategy: 'overwrite' | 'skip' | 'error';
}

/** Result of an import operation. */
export interface ImportResult {
  /** Number of translations that were created for the first time. */
  created: number;
  /** Number of translations that were updated (overwritten). */
  updated: number;
  /** Number of translations that were skipped due to conflict strategy. */
  skipped: number;
}

/** Options for the export operation. */
export interface ExportOptions {
  /** BCP-47 locale to export translations for. */
  locale: string;
  /** Output format. */
  format: FormatId;
  /** Optional namespace to restrict the export to. */
  namespace?: string;
  /** Optional list of translation statuses to include. */
  statusFilter?: string[];
}

/** Result of an export operation. */
export interface ExportResult {
  /** Serialized file content. */
  content: string;
  /** File extension (with leading dot) for the output format. */
  fileExtension: string;
  /** Number of entries included in the export. */
  entryCount: number;
}

// ── Import ───────────────────────────────────────────────────────────────────

/**
 * Imports translations from a file content string into a project.
 *
 * Parses the content using the appropriate format adapter, creates any
 * missing translation keys, and upserts translations for the given locale
 * according to the specified conflict resolution strategy.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project to import into.
 * @param options - Import configuration including locale, format, content, and conflict strategy.
 * @returns An {@link ImportResult} with counts of created, updated, and skipped entries.
 * @throws {Error} When the format is unsupported or content cannot be parsed.
 *
 * @example
 * ```ts
 * const result = await importTranslations(db, projectId, {
 *   locale: 'fr',
 *   format: 'flat-json',
 *   content: '{ "hello": "Bonjour" }',
 *   conflictStrategy: 'overwrite',
 * });
 * ```
 */
export async function importTranslations(
  db: Database,
  projectId: string,
  options: ImportOptions,
): Promise<ImportResult> {
  const adapter = getAdapter(options.format);
  const map = adapter.parse(options.content);
  const entries = Object.entries(map);

  if (entries.length === 0) {
    return { created: 0, updated: 0, skipped: 0 };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Ensure all keys exist in the project.
  const keyPayloads = entries.map(([key]) => ({
    projectId,
    key,
    defaultValue: '',
    namespaceId: undefined as string | undefined,
  }));
  await keyRepo.createMany(db, keyPayloads);

  // Process each entry.
  for (const [key, value] of entries) {
    const keyRow = await keyRepo.findByProjectAndKey(db, projectId, key);
    if (!keyRow) continue;

    const existing = await translationRepo.findByKeyAndLocale(
      db,
      keyRow.id,
      options.locale,
    );

    if (existing) {
      // Key already has a translation for this locale.
      switch (options.conflictStrategy) {
        case 'skip':
          skipped++;
          continue;
        case 'error':
          throw new Error(
            `Conflict: key "${key}" already has a translation for locale "${options.locale}"`,
          );
        case 'overwrite':
          await translationRepo.upsert(db, {
            keyId: keyRow.id,
            locale: options.locale,
            value,
            status: 'draft',
            translatedBy: 'import',
          });
          updated++;
          break;
      }
    } else {
      await translationRepo.upsert(db, {
        keyId: keyRow.id,
        locale: options.locale,
        value,
        status: 'draft',
        translatedBy: 'import',
      });
      created++;
    }
  }

  return { created, updated, skipped };
}

// ── Export ────────────────────────────────────────────────────────────────────

/**
 * Exports translations for a project and locale in the specified format.
 *
 * Fetches all translations matching the given locale (and optional filters),
 * then serializes them using the appropriate format adapter.
 *
 * @param db - Drizzle ORM database instance.
 * @param projectId - UUID of the project to export from.
 * @param options - Export configuration including locale, format, and optional filters.
 * @returns An {@link ExportResult} with the serialized content and metadata.
 *
 * @example
 * ```ts
 * const result = await exportTranslations(db, projectId, {
 *   locale: 'fr',
 *   format: 'flat-json',
 * });
 * // result.content is the serialized JSON string
 * ```
 */
export async function exportTranslations(
  db: Database,
  projectId: string,
  options: ExportOptions,
): Promise<ExportResult> {
  const adapter = getAdapter(options.format);

  const rows = await translationRepo.findByProjectAndLocale(
    db,
    projectId,
    options.locale,
  );

  // Apply status filter if provided.
  let filtered = rows;
  if (options.statusFilter && options.statusFilter.length > 0) {
    filtered = rows.filter((r) => options.statusFilter!.includes(r.status));
  }

  // Build the translation map.
  const map: Record<string, string> = {};
  for (const row of filtered) {
    map[row.key] = row.value;
  }

  const content = adapter.serialize(map, { pretty: true, sortKeys: true });

  return {
    content,
    fileExtension: adapter.fileExtension,
    entryCount: Object.keys(map).length,
  };
}
