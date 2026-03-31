/**
 * Bundle generator for CDN-published translation files.
 *
 * Reads translation data and produces optimised JSON bundles keyed by locale
 * and, optionally, by namespace. Each bundle is a self-contained JSON object
 * mapping translation keys to their translated string values.
 *
 * @module bundle-generator
 */

import type { Locale, TranslationMap } from '@i18n-platform/core';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A single translation row as expected by the generator.
 * Mirrors the shape of the `translations` + `translation_keys` join result.
 */
export interface TranslationRow {
  /** The dot-separated translation key (e.g. `"auth.login.title"`). */
  key: string;
  /** BCP-47 locale of this translation (e.g. `"en"`, `"fr-CA"`). */
  locale: Locale;
  /** The translated string value. */
  value: string;
  /**
   * Optional namespace slug the key belongs to (e.g. `"auth"`, `"common"`).
   * `null` means the key has no namespace.
   */
  namespace: string | null;
}

/**
 * An individual bundle ready to be uploaded to CDN storage.
 *
 * The `key` property is the storage path where the bundle should be written.
 * The `content` property is the serialised JSON payload (UTF-8 bytes).
 */
export interface TranslationBundle {
  /** Storage key / path for this bundle (e.g. `"bundles/en/v1234567890.json"`). */
  key: string;
  /** Serialised UTF-8 encoded JSON content of the translation map. */
  content: Uint8Array;
  /** MIME content-type — always `"application/json"`. */
  contentType: 'application/json';
  /** BCP-47 locale this bundle covers. */
  locale: Locale;
  /**
   * Namespace this bundle is scoped to.
   * `undefined` means the bundle covers all namespaces for the locale.
   */
  namespace?: string;
}

/**
 * Options controlling how bundles are generated.
 */
export interface BundleGeneratorOptions {
  /**
   * When `true`, a separate bundle is produced for each unique namespace.
   * When `false` (default), all keys for a locale are merged into one bundle.
   */
  splitByNamespace?: boolean;

  /**
   * Storage path prefix prepended to every generated bundle key.
   *
   * @default "bundles"
   * @example "projects/my-project/bundles"
   */
  pathPrefix?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Encodes a plain `Record<string, string>` to a UTF-8 `Uint8Array` of
 * minified JSON.
 *
 * @param map - Translation key-value pairs to serialise
 * @returns UTF-8 encoded bytes
 * @internal
 */
function encodeJson(map: TranslationMap): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(map));
}

/**
 * Builds the storage key for a versioned bundle file.
 *
 * @param prefix - Storage path prefix (e.g. `"bundles"`)
 * @param locale - BCP-47 locale string
 * @param version - Version string (e.g. `"v1234567890"`)
 * @param namespace - Optional namespace slug
 * @returns Storage key string
 * @internal
 */
function buildBundleKey(
  prefix: string,
  locale: Locale,
  version: string,
  namespace?: string,
): string {
  if (namespace !== undefined) {
    return `${prefix}/${locale}/${namespace}/${version}.json`;
  }
  return `${prefix}/${locale}/${version}.json`;
}

// ── BundleGenerator ───────────────────────────────────────────────────────────

/**
 * Generates optimised JSON translation bundles from a flat list of
 * translation rows.
 *
 * @example
 * ```ts
 * const generator = new BundleGenerator({ splitByNamespace: true });
 * const bundles = generator.generate(rows, 'v1700000000000');
 * ```
 */
export class BundleGenerator {
  private readonly splitByNamespace: boolean;
  private readonly pathPrefix: string;

  /**
   * @param options - Generation options
   */
  constructor(options: BundleGeneratorOptions = {}) {
    this.splitByNamespace = options.splitByNamespace ?? false;
    this.pathPrefix = options.pathPrefix ?? 'bundles';
  }

  /**
   * Generates one or more {@link TranslationBundle} objects from the supplied
   * translation rows.
   *
   * When {@link BundleGeneratorOptions.splitByNamespace} is `true`, one bundle
   * is produced per `(locale, namespace)` pair. Otherwise a single bundle is
   * produced per locale that merges all namespaces.
   *
   * @param rows - Flat array of translation rows to bundle
   * @param version - Version string to embed in the storage key
   * @returns Array of bundles ready for upload
   */
  generate(rows: TranslationRow[], version: string): TranslationBundle[] {
    if (this.splitByNamespace) {
      return this.generateByNamespace(rows, version);
    }
    return this.generateByLocale(rows, version);
  }

  /**
   * Generates one bundle per locale, merging all namespaces.
   *
   * @param rows - Translation rows
   * @param version - Version string
   * @returns Per-locale bundles
   * @internal
   */
  private generateByLocale(rows: TranslationRow[], version: string): TranslationBundle[] {
    // Group rows by locale
    const localeMap = new Map<Locale, TranslationMap>();

    for (const row of rows) {
      let map = localeMap.get(row.locale);
      if (map === undefined) {
        map = {};
        localeMap.set(row.locale, map);
      }
      map[row.key] = row.value;
    }

    const bundles: TranslationBundle[] = [];
    for (const [locale, map] of localeMap) {
      bundles.push({
        key: buildBundleKey(this.pathPrefix, locale, version),
        content: encodeJson(map),
        contentType: 'application/json',
        locale,
      });
    }
    return bundles;
  }

  /**
   * Generates one bundle per `(locale, namespace)` pair.
   *
   * Keys that have no namespace are placed in a special `"_"` namespace
   * bundle so they are still accessible.
   *
   * @param rows - Translation rows
   * @param version - Version string
   * @returns Per-locale-per-namespace bundles
   * @internal
   */
  private generateByNamespace(rows: TranslationRow[], version: string): TranslationBundle[] {
    // Group rows by locale -> namespace -> key/value
    const grouped = new Map<Locale, Map<string, TranslationMap>>();

    for (const row of rows) {
      const ns = row.namespace ?? '_';

      let nsMap = grouped.get(row.locale);
      if (nsMap === undefined) {
        nsMap = new Map<string, TranslationMap>();
        grouped.set(row.locale, nsMap);
      }

      let map = nsMap.get(ns);
      if (map === undefined) {
        map = {};
        nsMap.set(ns, map);
      }
      map[row.key] = row.value;
    }

    const bundles: TranslationBundle[] = [];
    for (const [locale, nsMap] of grouped) {
      for (const [ns, map] of nsMap) {
        bundles.push({
          key: buildBundleKey(this.pathPrefix, locale, version, ns),
          content: encodeJson(map),
          contentType: 'application/json',
          locale,
          namespace: ns,
        });
      }
    }
    return bundles;
  }
}
