/**
 * Storage adapter interface for binary/blob object storage.
 *
 * Implement this interface to integrate a cloud or local storage backend
 * (e.g., AWS S3, Google Cloud Storage, Azure Blob, local disk).
 *
 * @module interfaces/storage-adapter
 */

/**
 * Result of a successful file upload operation.
 */
export interface UploadResult {
  /** Storage path / key under which the object was stored */
  key: string;
  /**
   * Public URL at which the object can be retrieved, or `null` if the
   * storage backend does not expose a public URL.
   */
  publicUrl: string | null;
  /** Size of the uploaded object in bytes */
  sizeBytes: number;
  /** MIME content type of the uploaded object */
  contentType: string;
  /** ISO 8601 timestamp of when the object was stored */
  uploadedAt: string;
}

/**
 * Metadata for an object stored in the storage backend.
 */
export interface StorageObject {
  /** Storage path / key of the object */
  key: string;
  /** Size of the object in bytes */
  sizeBytes: number;
  /** MIME content type of the object */
  contentType: string;
  /** ISO 8601 last-modified timestamp */
  lastModifiedAt: string;
  /**
   * Opaque ETag value for cache validation.
   * Format depends on the storage provider.
   */
  etag?: string;
}

/**
 * Adapter for a binary object-storage backend.
 *
 * Used for storing translation export archives, screenshot context images,
 * and CDN-published translation bundles.
 *
 * @example
 * ```ts
 * class S3StorageAdapter implements IStorageAdapter {
 *   readonly storageId = 's3';
 *   // ...
 * }
 * ```
 */
export interface IStorageAdapter {
  /**
   * Unique identifier for this storage backend.
   * @example "s3", "gcs", "azure-blob", "local"
   */
  readonly storageId: string;

  /**
   * Uploads binary data to the storage backend.
   *
   * @param key - Storage path / key to store the object under
   * @param data - The binary content to upload
   * @param contentType - MIME type of the object (e.g., `"application/json"`)
   * @returns Metadata about the newly stored object
   * @throws {Error} If the upload fails
   */
  upload(key: string, data: Uint8Array, contentType: string): Promise<UploadResult>;

  /**
   * Downloads an object from the storage backend.
   *
   * @param key - Storage path / key of the object to retrieve
   * @returns The raw binary content of the object as a `Uint8Array`
   * @throws {Error} If the object does not exist or cannot be retrieved
   */
  download(key: string): Promise<Uint8Array>;

  /**
   * Deletes an object from the storage backend.
   *
   * @param key - Storage path / key of the object to delete
   * @throws {Error} If the deletion fails (a missing object should NOT throw)
   */
  delete(key: string): Promise<void>;

  /**
   * Returns the public URL for an object.
   *
   * @param key - Storage path / key of the object
   * @returns The public URL, or `null` if the backend does not support public URLs
   */
  getPublicUrl(key: string): string | null;

  /**
   * Lists objects stored under the given key prefix.
   *
   * @param prefix - Key prefix to filter objects by
   * @returns Array of object metadata for all matching objects
   */
  list(prefix: string): Promise<StorageObject[]>;
}
