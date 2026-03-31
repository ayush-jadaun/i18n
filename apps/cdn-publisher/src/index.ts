/**
 * @i18n-platform/cdn-publisher
 *
 * Background worker that generates optimised JSON translation bundles and
 * uploads them to CDN storage via the {@link IStorageAdapter} contract.
 *
 * ### Public API
 *
 * - {@link BundleGenerator} — converts translation rows into JSON bundles
 * - {@link VersionManager} — generates version strings and latest aliases
 * - {@link CdnPublisher} — full publish pipeline
 *
 * @packageDocumentation
 */

export type {
  TranslationRow,
  TranslationBundle,
  BundleGeneratorOptions,
} from './bundle-generator';

export { BundleGenerator } from './bundle-generator';

export type { LatestAliasBundle } from './version-manager';

export { VersionManager } from './version-manager';

export type { PublishOptions, PublishResult } from './publisher';

export { CdnPublisher } from './publisher';
