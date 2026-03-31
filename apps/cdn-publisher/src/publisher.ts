/**
 * CDN Publisher — orchestrates bundle generation and CDN upload.
 *
 * The {@link CdnPublisher} class ties together the {@link BundleGenerator}
 * and {@link VersionManager} to form the complete publish pipeline:
 *
 * 1. Generate a fresh version string.
 * 2. Build versioned JSON bundles from translation rows.
 * 3. Build "latest" alias bundles.
 * 4. Upload all bundles to the configured {@link IStorageAdapter}.
 * 5. Return a {@link PublishResult} with a full summary.
 *
 * @module publisher
 */

import type { IStorageAdapter, UploadResult } from '@i18n-platform/core';
import type { TranslationRow, TranslationBundle } from './bundle-generator';
import { BundleGenerator } from './bundle-generator';
import type { LatestAliasBundle } from './version-manager';
import { VersionManager } from './version-manager';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Options that control a single publish run.
 */
export interface PublishOptions {
  /**
   * Translation rows to publish.
   *
   * Typically sourced from a database query that joins `translation_keys` and
   * `translations` for a given project.
   */
  rows: TranslationRow[];

  /**
   * Optional explicit version string.
   *
   * When omitted the {@link VersionManager} generates a fresh
   * timestamp-based version automatically.
   */
  version?: string;
}

/**
 * Result returned after a successful publish run.
 */
export interface PublishResult {
  /** The version string used for all versioned bundles in this run. */
  version: string;
  /** Number of versioned bundles uploaded. */
  bundleCount: number;
  /** Number of "latest" alias bundles uploaded. */
  aliasCount: number;
  /** Flat array of {@link UploadResult} for every object uploaded. */
  uploads: UploadResult[];
  /** ISO 8601 timestamp of when the publish completed. */
  publishedAt: string;
}

// ── CdnPublisher ──────────────────────────────────────────────────────────────

/**
 * Orchestrates the full CDN publish pipeline.
 *
 * @example
 * ```ts
 * const publisher = new CdnPublisher(storageAdapter, generator, versionManager);
 * const result = await publisher.publish({ rows });
 * console.log(`Published ${result.bundleCount} bundles at version ${result.version}`);
 * ```
 */
export class CdnPublisher {
  private readonly storage: IStorageAdapter;
  private readonly generator: BundleGenerator;
  private readonly versionManager: VersionManager;

  /**
   * @param storage - Storage adapter used to upload bundles
   * @param generator - Bundle generator that converts rows into JSON bundles
   * @param versionManager - Version manager for timestamps and latest aliases
   */
  constructor(
    storage: IStorageAdapter,
    generator: BundleGenerator,
    versionManager: VersionManager,
  ) {
    this.storage = storage;
    this.generator = generator;
    this.versionManager = versionManager;
  }

  /**
   * Executes the full publish pipeline for the supplied translation rows.
   *
   * Steps performed:
   * 1. Resolve the version string (use `options.version` or generate one).
   * 2. Generate versioned {@link TranslationBundle}s.
   * 3. Generate "latest" alias {@link LatestAliasBundle}s.
   * 4. Upload all bundles concurrently.
   * 5. Return a {@link PublishResult} summarising the run.
   *
   * @param options - Publish configuration and input data
   * @returns A result object describing what was uploaded
   * @throws {Error} If any upload to the storage adapter fails
   *
   * @example
   * ```ts
   * const result = await publisher.publish({ rows: translationRows });
   * console.log(result.version); // "v1700000000000"
   * ```
   */
  async publish(options: PublishOptions): Promise<PublishResult> {
    const { rows, version: explicitVersion } = options;

    // Step 1: Resolve version
    const version = explicitVersion ?? this.versionManager.generateVersion();

    // Step 2: Generate versioned bundles
    const versionedBundles: TranslationBundle[] = this.generator.generate(rows, version);

    // Step 3: Generate latest alias bundles
    const aliasBundles: LatestAliasBundle[] = this.versionManager.createLatestAliases(versionedBundles);

    // Step 4: Upload all bundles concurrently (versioned first, then aliases)
    const allBundles: TranslationBundle[] = [...versionedBundles, ...aliasBundles];
    const uploads = await this.uploadAll(allBundles);

    // Step 5: Return publish result
    return {
      version,
      bundleCount: versionedBundles.length,
      aliasCount: aliasBundles.length,
      uploads,
      publishedAt: new Date().toISOString(),
    };
  }

  /**
   * Uploads all bundles concurrently to the configured storage adapter.
   *
   * @param bundles - Bundles to upload
   * @returns Array of upload results in the same order as the input
   * @throws {Error} If any upload fails (via `Promise.all` rejection)
   * @internal
   */
  private async uploadAll(bundles: TranslationBundle[]): Promise<UploadResult[]> {
    return Promise.all(
      bundles.map((bundle) =>
        this.storage.upload(bundle.key, bundle.content, bundle.contentType),
      ),
    );
  }
}
