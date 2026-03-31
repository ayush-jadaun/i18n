/**
 * Storage adapters for the i18n platform.
 *
 * Available implementations:
 * - {@link LocalFsStorageAdapter} — local filesystem storage (no external deps)
 * - {@link S3StorageAdapter} — AWS S3 / S3-compatible object storage
 *
 * Both implement {@link IStorageAdapter} from `../../interfaces/storage-adapter`.
 *
 * @module adapters/storage
 */

export { LocalFsStorageAdapter } from './local-fs.adapter';
export type { LocalFsStorageConfig } from './local-fs.adapter';

export { S3StorageAdapter } from './s3.adapter';
export type { S3StorageConfig, S3ClientLike, S3BodyStream } from './s3.adapter';
