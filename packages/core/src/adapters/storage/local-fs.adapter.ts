/**
 * Local filesystem storage adapter.
 *
 * Stores objects as plain files under a configurable base directory.
 * Intended for local development and testing environments; not recommended
 * for production deployments where a shared object-store (S3, GCS, etc.) is
 * preferred.
 *
 * @module adapters/storage/local-fs
 */

import {
  readFile,
  writeFile,
  unlink,
  stat,
  mkdir,
  readdir,
} from 'node:fs/promises';
import { join, dirname, relative, sep } from 'node:path';
import type { IStorageAdapter, StorageObject, UploadResult } from '../../interfaces/storage-adapter';

/**
 * Configuration for {@link LocalFsStorageAdapter}.
 */
export interface LocalFsStorageConfig {
  /**
   * Absolute path to the root directory under which all objects are stored.
   *
   * @example "/var/data/i18n-uploads"
   */
  basePath: string;

  /**
   * Optional public base URL that maps to `basePath`.
   *
   * When set, {@link LocalFsStorageAdapter.getPublicUrl} returns
   * `baseUrl + "/" + key`.  Trailing slashes on `baseUrl` are trimmed.
   *
   * @example "https://cdn.example.com"
   */
  baseUrl?: string;
}

/**
 * Recursively collects all file paths under `dir`, returning them as an
 * array of absolute paths.
 *
 * @param dir - Absolute path of the directory to walk
 * @returns Array of absolute file paths
 * @internal
 */
async function walkDir(dir: string): Promise<string[]> {
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await walkDir(fullPath);
      results.push(...nested);
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Storage adapter that persists objects as files on the local filesystem.
 *
 * Keys may contain path separators (`/`) which are translated to the OS
 * directory separator so that `upload("a/b/c.json", …)` writes the file to
 * `<basePath>/a/b/c.json`.  Parent directories are created automatically.
 *
 * @example
 * ```ts
 * const storage = new LocalFsStorageAdapter({
 *   basePath: '/var/data/i18n',
 *   baseUrl: 'https://cdn.example.com',
 * });
 * const data = await fs.readFile('en.json');
 * await storage.upload('bundles/en.json', data, 'application/json');
 * ```
 */
export class LocalFsStorageAdapter implements IStorageAdapter {
  /** @inheritdoc */
  readonly storageId = 'local';

  private readonly basePath: string;
  private readonly baseUrl: string | null;

  /**
   * @param config - Filesystem storage configuration
   */
  constructor(config: LocalFsStorageConfig) {
    this.basePath = config.basePath;
    this.baseUrl = config.baseUrl ? config.baseUrl.replace(/\/+$/, '') : null;
  }

  /**
   * Resolves a storage key to an absolute filesystem path.
   *
   * Forward slashes in the key are converted to the platform separator.
   *
   * @param key - Storage key
   * @returns Absolute path under `basePath`
   * @internal
   */
  private resolve(key: string): string {
    // Normalise separator: keys always use '/', but Windows uses '\'
    const normalised = key.split('/').join(sep);
    return join(this.basePath, normalised);
  }

  /**
   * Uploads binary data to a file at `basePath/key`.
   *
   * Parent directories are created automatically if they do not yet exist.
   *
   * @param key - Storage key (may include path separators)
   * @param data - Binary content to write
   * @param contentType - MIME type of the content
   * @returns Metadata about the newly written file
   */
  async upload(key: string, data: Uint8Array, contentType: string): Promise<UploadResult> {
    const filePath = this.resolve(key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data);

    return {
      key,
      publicUrl: this.getPublicUrl(key),
      sizeBytes: data.byteLength,
      contentType,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Reads the file at `basePath/key` and returns its content as a
   * `Uint8Array`.
   *
   * @param key - Storage key of the file to read
   * @returns Raw file bytes
   * @throws {Error} If the file does not exist or cannot be read
   */
  async download(key: string): Promise<Uint8Array> {
    const filePath = this.resolve(key);
    const buffer = await readFile(filePath);
    return new Uint8Array(buffer);
  }

  /**
   * Deletes the file at `basePath/key`.
   *
   * If the file does not exist the operation is silently ignored (ENOENT is
   * swallowed).
   *
   * @param key - Storage key of the file to delete
   */
  async delete(key: string): Promise<void> {
    const filePath = this.resolve(key);
    try {
      await unlink(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /**
   * Returns the public URL for a stored object.
   *
   * @param key - Storage key
   * @returns `baseUrl/key` if a base URL was configured, otherwise `null`
   */
  getPublicUrl(key: string): string | null {
    if (this.baseUrl === null) {
      return null;
    }
    return `${this.baseUrl}/${key}`;
  }

  /**
   * Lists all objects stored under `prefix`.
   *
   * The `prefix` is matched against each object's key (relative path from
   * `basePath`), so `list("bundle/en")` returns objects whose keys start
   * with `"bundle/en"`.
   *
   * @param prefix - Key prefix to filter results
   * @returns Array of {@link StorageObject} metadata for matching files
   */
  async list(prefix: string): Promise<StorageObject[]> {
    // Resolve the prefix directory or the basePath when prefix is empty
    const prefixDir = prefix ? this.resolve(prefix) : this.basePath;

    const allPaths = await walkDir(prefixDir);
    const results: StorageObject[] = [];

    for (const absPath of allPaths) {
      // Convert back to a forward-slash key relative to basePath
      const relPath = relative(this.basePath, absPath);
      const key = relPath.split(sep).join('/');

      if (prefix && !key.startsWith(prefix)) {
        continue;
      }

      try {
        const info = await stat(absPath);
        results.push({
          key,
          sizeBytes: info.size,
          contentType: 'application/octet-stream',
          lastModifiedAt: info.mtime.toISOString(),
        });
      } catch {
        // File disappeared between walk and stat — skip it
      }
    }

    return results;
  }
}
