/**
 * AWS S3 storage adapter.
 *
 * Wraps an `@aws-sdk/client-s3`-compatible client to provide a
 * {@link IStorageAdapter} implementation backed by Amazon S3 (or any
 * S3-compatible object store such as MinIO or Cloudflare R2).
 *
 * The adapter accepts a {@link S3ClientLike} interface in its constructor so
 * that `@aws-sdk/client-s3` is **not** a required dependency of
 * `@i18n-platform/core`.  In application code you pass a real `S3Client`; in
 * tests you pass a lightweight mock.
 *
 * @module adapters/storage/s3
 */

import type { IStorageAdapter, StorageObject, UploadResult } from '../../interfaces/storage-adapter';

// ---------------------------------------------------------------------------
// Minimal command + client types
// ---------------------------------------------------------------------------

/**
 * Minimal interface for an S3 command object (matches the shape produced by
 * the real `@aws-sdk/client-s3` command constructors).
 *
 * @internal
 */
export interface S3Command {
  /** The command input parameters. */
  input: Record<string, unknown>;
}

/**
 * Minimal interface for a streaming body as returned by `GetObjectCommand`.
 *
 * The real `@aws-sdk/client-s3` `SdkStream` satisfies this interface.
 */
export interface S3BodyStream {
  /** Collects the full stream into a `Uint8Array`. */
  transformToByteArray(): Promise<Uint8Array>;
}

/**
 * Minimal subset of the `S3Client` API that {@link S3StorageAdapter} requires.
 *
 * The real `@aws-sdk/client-s3` `S3Client` satisfies this interface
 * automatically, so you can pass it directly without any casting.
 */
export interface S3ClientLike {
  /**
   * Sends an S3 command and returns the service response.
   *
   * @param command - Any S3 command object (PutObject, GetObject, …)
   */
  send(command: S3Command): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Minimal command implementations (avoid pulling in the real SDK at the core
// package level — the real SDK is only needed at the application server layer)
// ---------------------------------------------------------------------------

/**
 * Minimal `PutObjectCommand` shape.
 * @internal
 */
class PutObjectCommand implements S3Command {
  readonly input: Record<string, unknown>;
  constructor(input: { Bucket: string; Key: string; Body: Uint8Array; ContentType: string }) {
    this.input = input as unknown as Record<string, unknown>;
  }
}

/**
 * Minimal `GetObjectCommand` shape.
 * @internal
 */
class GetObjectCommand implements S3Command {
  readonly input: Record<string, unknown>;
  constructor(input: { Bucket: string; Key: string }) {
    this.input = input as unknown as Record<string, unknown>;
  }
}

/**
 * Minimal `DeleteObjectCommand` shape.
 * @internal
 */
class DeleteObjectCommand implements S3Command {
  readonly input: Record<string, unknown>;
  constructor(input: { Bucket: string; Key: string }) {
    this.input = input as unknown as Record<string, unknown>;
  }
}

/**
 * Minimal `ListObjectsV2Command` shape.
 * @internal
 */
class ListObjectsV2Command implements S3Command {
  readonly input: Record<string, unknown>;
  constructor(input: {
    Bucket: string;
    Prefix: string;
    ContinuationToken?: string;
  }) {
    this.input = input as unknown as Record<string, unknown>;
  }
}

// ---------------------------------------------------------------------------
// Config + adapter
// ---------------------------------------------------------------------------

/**
 * Configuration for {@link S3StorageAdapter}.
 */
export interface S3StorageConfig {
  /** S3 bucket name. */
  bucket: string;
  /** AWS region (e.g. `"us-east-1"`). */
  region: string;
  /**
   * Optional custom endpoint URL for S3-compatible stores (MinIO, R2, etc.).
   * @example "http://localhost:9000"
   */
  endpoint?: string;
  /** AWS access key ID. */
  accessKeyId: string;
  /** AWS secret access key. */
  secretAccessKey: string;
  /**
   * Force path-style URLs instead of virtual-hosted style.
   * Required for MinIO and some S3-compatible services.
   */
  forcePathStyle?: boolean;
  /**
   * Optional public CDN base URL.  When set, {@link S3StorageAdapter.getPublicUrl}
   * returns `publicBaseUrl + "/" + key`.
   * @example "https://cdn.example.com"
   */
  publicBaseUrl?: string;
}

/**
 * S3 `GetObjectCommand` response shape (only the fields we consume).
 * @internal
 */
interface GetObjectOutput {
  Body?: S3BodyStream;
}

/**
 * S3 `ListObjectsV2Command` response shape (only the fields we consume).
 * @internal
 */
interface ListObjectsV2Output {
  Contents?: Array<{
    Key?: string;
    Size?: number;
    LastModified?: Date;
    ETag?: string;
  }>;
  IsTruncated?: boolean;
  NextContinuationToken?: string;
}

/**
 * Storage adapter backed by Amazon S3 (or an S3-compatible object store).
 *
 * @example
 * ```ts
 * import { S3Client } from '@aws-sdk/client-s3';
 *
 * const client = new S3Client({ region: 'us-east-1' });
 * const storage = new S3StorageAdapter(
 *   { bucket: 'my-bucket', region: 'us-east-1', accessKeyId: '…', secretAccessKey: '…' },
 *   client,
 * );
 * ```
 */
export class S3StorageAdapter implements IStorageAdapter {
  /** @inheritdoc */
  readonly storageId = 's3';

  private readonly bucket: string;
  private readonly publicBaseUrl: string | null;
  private readonly client: S3ClientLike;

  /**
   * @param config - S3 bucket and credential configuration
   * @param client - An `S3ClientLike` instance (real SDK client or mock)
   */
  constructor(config: S3StorageConfig, client: S3ClientLike) {
    this.bucket = config.bucket;
    this.publicBaseUrl = config.publicBaseUrl
      ? config.publicBaseUrl.replace(/\/+$/, '')
      : null;
    this.client = client;
  }

  /**
   * Uploads binary data to S3 using `PutObjectCommand`.
   *
   * @param key - S3 object key
   * @param data - Binary content to upload
   * @param contentType - MIME type of the content
   * @returns Metadata about the stored object
   * @throws {Error} If the S3 `PutObject` call fails
   */
  async upload(key: string, data: Uint8Array, contentType: string): Promise<UploadResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );

    return {
      key,
      publicUrl: this.getPublicUrl(key),
      sizeBytes: data.byteLength,
      contentType,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Downloads an object from S3 using `GetObjectCommand`.
   *
   * @param key - S3 object key
   * @returns The raw content as a `Uint8Array`
   * @throws {Error} If the object does not exist or the response has no body
   */
  async download(key: string): Promise<Uint8Array> {
    const response = (await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )) as GetObjectOutput;

    if (!response.Body) {
      throw new Error(`S3StorageAdapter: no body in GetObject response for key "${key}"`);
    }

    return response.Body.transformToByteArray();
  }

  /**
   * Deletes an object from S3 using `DeleteObjectCommand`.
   *
   * S3 returns success even if the key does not exist, so this method never
   * throws for missing objects.
   *
   * @param key - S3 object key to delete
   */
  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /**
   * Returns the public URL for an object.
   *
   * @param key - S3 object key
   * @returns `publicBaseUrl/key` if configured, otherwise `null`
   */
  getPublicUrl(key: string): string | null {
    if (this.publicBaseUrl === null) {
      return null;
    }
    return `${this.publicBaseUrl}/${key}`;
  }

  /**
   * Lists objects under `prefix` using `ListObjectsV2Command`.
   *
   * Handles pagination automatically: if the response is truncated the method
   * continues fetching pages using the `ContinuationToken` until all results
   * are collected.
   *
   * @param prefix - Key prefix to filter results (forwarded as S3 `Prefix`)
   * @returns Array of {@link StorageObject} metadata for all matching objects
   */
  async list(prefix: string): Promise<StorageObject[]> {
    const results: StorageObject[] = [];
    let continuationToken: string | undefined;

    do {
      const response = (await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      )) as ListObjectsV2Output;

      for (const item of response.Contents ?? []) {
        results.push({
          key: item.Key ?? '',
          sizeBytes: item.Size ?? 0,
          contentType: 'application/octet-stream',
          lastModifiedAt: item.LastModified?.toISOString() ?? new Date(0).toISOString(),
          etag: item.ETag,
        });
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken !== undefined);

    return results;
  }
}
