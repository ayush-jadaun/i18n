/**
 * Version manager for CDN translation bundles.
 *
 * Handles generation of timestamp-based version strings and the creation of
 * "latest" alias bundles that always point to the most recently published
 * version.
 *
 * @module version-manager
 */

import type { TranslationBundle } from './bundle-generator';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A "latest" alias bundle — identical in content to the versioned original but
 * stored under a stable `latest.json` key so clients can always resolve the
 * current translation set without knowing the concrete version string.
 */
export interface LatestAliasBundle extends TranslationBundle {
  /**
   * The concrete version string this alias was derived from.
   * Useful for logging and cache-busting diagnostics.
   */
  aliasOf: string;
}

// ── VersionManager ────────────────────────────────────────────────────────────

/**
 * Generates version strings and creates "latest" alias bundles.
 *
 * Version strings are timestamp-based (`v${Date.now()}`) which guarantees
 * monotonically increasing identifiers within a single machine and provides a
 * human-readable approximation of when the publish occurred.
 *
 * @example
 * ```ts
 * const vm = new VersionManager();
 * const version = vm.generateVersion();  // e.g. "v1700000000000"
 * const aliases = vm.createLatestAliases(versioned);
 * ```
 */
export class VersionManager {
  /**
   * Generates a new timestamp-based version string.
   *
   * The version has the form `v${Date.now()}`, where `Date.now()` returns the
   * number of milliseconds since the Unix epoch.  This approach is intentionally
   * simple: it is monotonically increasing within a process and makes publish
   * timestamps immediately legible from the storage key.
   *
   * @returns A version string such as `"v1700000000000"`
   *
   * @example
   * ```ts
   * const version = new VersionManager().generateVersion();
   * // => "v1700000000000"
   * ```
   */
  generateVersion(): string {
    return `v${Date.now()}`;
  }

  /**
   * Creates "latest" alias bundles from an array of versioned bundles.
   *
   * For each versioned bundle the method produces a new bundle whose storage
   * key replaces the version segment with `"latest"` while keeping the same
   * content, locale, and namespace.  This gives consumers a stable URL they
   * can always fetch without tracking version strings.
   *
   * The key transformation is:
   * ```
   * "bundles/en/v1700000000000.json"       -> "bundles/en/latest.json"
   * "bundles/en/auth/v1700000000000.json"  -> "bundles/en/auth/latest.json"
   * ```
   *
   * @param bundles - The versioned bundles to alias
   * @returns A parallel array of latest-alias bundles
   *
   * @example
   * ```ts
   * const aliases = vm.createLatestAliases(versioned);
   * // aliases[0].key === "bundles/en/latest.json"
   * // aliases[0].aliasOf === "v1700000000000"
   * ```
   */
  createLatestAliases(bundles: TranslationBundle[]): LatestAliasBundle[] {
    return bundles.map((bundle) => {
      const latestKey = this.toLatestKey(bundle.key);
      // Extract the version segment embedded in the original key so we can
      // store it on aliasOf for diagnostics.
      const aliasOf = this.extractVersion(bundle.key);

      return {
        ...bundle,
        key: latestKey,
        aliasOf,
      };
    });
  }

  /**
   * Replaces the version filename segment in a storage key with `"latest"`.
   *
   * Matches a filename segment of the form `v<digits>.json` at the end of the
   * key and substitutes it with `latest.json`.  If the pattern is not found
   * the key is returned unchanged (defensive behaviour).
   *
   * @param key - Versioned storage key
   * @returns Storage key with the version replaced by `"latest"`
   * @internal
   */
  private toLatestKey(key: string): string {
    return key.replace(/v\d+\.json$/, 'latest.json');
  }

  /**
   * Extracts the version string (`v<digits>`) from a versioned storage key.
   *
   * @param key - Versioned storage key
   * @returns The version string (e.g. `"v1700000000000"`) or `"unknown"` if
   *   the pattern is not found
   * @internal
   */
  private extractVersion(key: string): string {
    const match = /v\d+/.exec(key);
    return match?.[0] ?? 'unknown';
  }
}
