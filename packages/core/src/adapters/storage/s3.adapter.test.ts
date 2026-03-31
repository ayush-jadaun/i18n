/**
 * Tests for S3StorageAdapter.
 *
 * The S3 client is mocked via {@link S3ClientLike} so no AWS credentials or
 * network access are required.
 *
 * @module adapters/storage/s3.adapter.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3StorageAdapter, type S3ClientLike } from './s3.adapter';

/** Streaming body helper that returns an array of chunks. */
function makeBody(data: Uint8Array): { transformToByteArray(): Promise<Uint8Array> } {
  return {
    async transformToByteArray() {
      return data;
    },
  };
}

/**
 * Creates a fully-mocked {@link S3ClientLike}.
 */
function makeMockS3(): S3ClientLike & {
  send: ReturnType<typeof vi.fn>;
} {
  return { send: vi.fn() };
}

const BASE_CONFIG = {
  bucket: 'my-bucket',
  region: 'us-east-1',
  accessKeyId: 'AKI',
  secretAccessKey: 'secret',
};

describe('S3StorageAdapter', () => {
  let mockS3: ReturnType<typeof makeMockS3>;
  let adapter: S3StorageAdapter;

  beforeEach(() => {
    mockS3 = makeMockS3();
    adapter = new S3StorageAdapter(BASE_CONFIG, mockS3);
  });

  // ---------------------------------------------------------------------------
  // storageId
  // ---------------------------------------------------------------------------

  it('should expose storageId "s3"', () => {
    expect(adapter.storageId).toBe('s3');
  });

  // ---------------------------------------------------------------------------
  // getPublicUrl
  // ---------------------------------------------------------------------------

  describe('getPublicUrl', () => {
    it('should return null when no publicBaseUrl is configured', () => {
      expect(adapter.getPublicUrl('file.txt')).toBeNull();
    });

    it('should return publicBaseUrl + "/" + key when configured', () => {
      const a = new S3StorageAdapter(
        { ...BASE_CONFIG, publicBaseUrl: 'https://cdn.example.com' },
        mockS3,
      );
      expect(a.getPublicUrl('bundle/en.json')).toBe('https://cdn.example.com/bundle/en.json');
    });

    it('should not double-slash when publicBaseUrl ends with "/"', () => {
      const a = new S3StorageAdapter(
        { ...BASE_CONFIG, publicBaseUrl: 'https://cdn.example.com/' },
        mockS3,
      );
      expect(a.getPublicUrl('file.txt')).toBe('https://cdn.example.com/file.txt');
    });
  });

  // ---------------------------------------------------------------------------
  // upload
  // ---------------------------------------------------------------------------

  describe('upload', () => {
    it('should call send with a PutObjectCommand and return UploadResult', async () => {
      mockS3.send.mockResolvedValue({});
      const data = new TextEncoder().encode('hello s3');
      const result = await adapter.upload('path/file.txt', data, 'text/plain');

      expect(mockS3.send).toHaveBeenCalledOnce();
      const [command] = mockS3.send.mock.calls[0] as [{ input: Record<string, unknown> }];
      expect(command.input['Bucket']).toBe('my-bucket');
      expect(command.input['Key']).toBe('path/file.txt');
      expect(command.input['Body']).toBe(data);
      expect(command.input['ContentType']).toBe('text/plain');

      expect(result.key).toBe('path/file.txt');
      expect(result.sizeBytes).toBe(data.byteLength);
      expect(result.contentType).toBe('text/plain');
      expect(result.publicUrl).toBeNull();
      expect(typeof result.uploadedAt).toBe('string');
    });

    it('should include publicUrl in result when publicBaseUrl is configured', async () => {
      const a = new S3StorageAdapter(
        { ...BASE_CONFIG, publicBaseUrl: 'https://cdn.example.com' },
        mockS3,
      );
      mockS3.send.mockResolvedValue({});
      const data = new TextEncoder().encode('x');
      const result = await a.upload('img.png', data, 'image/png');
      expect(result.publicUrl).toBe('https://cdn.example.com/img.png');
    });
  });

  // ---------------------------------------------------------------------------
  // download
  // ---------------------------------------------------------------------------

  describe('download', () => {
    it('should call send with GetObjectCommand and return body bytes', async () => {
      const data = new TextEncoder().encode('file content');
      mockS3.send.mockResolvedValue({ Body: makeBody(data) });

      const result = await adapter.download('path/file.txt');
      expect(result).toEqual(data);

      const [command] = mockS3.send.mock.calls[0] as [{ input: Record<string, unknown> }];
      expect(command.input['Bucket']).toBe('my-bucket');
      expect(command.input['Key']).toBe('path/file.txt');
    });

    it('should throw when the S3 response has no Body', async () => {
      mockS3.send.mockResolvedValue({ Body: undefined });
      await expect(adapter.download('missing.txt')).rejects.toThrow(
        /no body/i,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // delete
  // ---------------------------------------------------------------------------

  describe('delete', () => {
    it('should call send with DeleteObjectCommand', async () => {
      mockS3.send.mockResolvedValue({});
      await adapter.delete('path/file.txt');

      expect(mockS3.send).toHaveBeenCalledOnce();
      const [command] = mockS3.send.mock.calls[0] as [{ input: Record<string, unknown> }];
      expect(command.input['Bucket']).toBe('my-bucket');
      expect(command.input['Key']).toBe('path/file.txt');
    });

    it('should not throw for a missing key (S3 returns success anyway)', async () => {
      mockS3.send.mockResolvedValue({});
      await expect(adapter.delete('nonexistent.txt')).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // list
  // ---------------------------------------------------------------------------

  describe('list', () => {
    it('should call send with ListObjectsV2Command and map results', async () => {
      const now = new Date();
      mockS3.send.mockResolvedValue({
        Contents: [
          {
            Key: 'bundle/en/main.json',
            Size: 123,
            LastModified: now,
            ETag: '"abc123"',
          },
          {
            Key: 'bundle/en/extra.json',
            Size: 45,
            LastModified: now,
            ETag: '"def456"',
          },
        ],
        IsTruncated: false,
      });

      const objects = await adapter.list('bundle/en');

      expect(mockS3.send).toHaveBeenCalledOnce();
      const [command] = mockS3.send.mock.calls[0] as [{ input: Record<string, unknown> }];
      expect(command.input['Bucket']).toBe('my-bucket');
      expect(command.input['Prefix']).toBe('bundle/en');

      expect(objects).toHaveLength(2);
      expect(objects[0]).toMatchObject({
        key: 'bundle/en/main.json',
        sizeBytes: 123,
        etag: '"abc123"',
      });
    });

    it('should return an empty array when Contents is undefined', async () => {
      mockS3.send.mockResolvedValue({ Contents: undefined, IsTruncated: false });
      const objects = await adapter.list('empty/prefix');
      expect(objects).toEqual([]);
    });

    it('should handle missing Size gracefully (default to 0)', async () => {
      const now = new Date();
      mockS3.send.mockResolvedValue({
        Contents: [{ Key: 'file.txt', Size: undefined, LastModified: now }],
        IsTruncated: false,
      });
      const objects = await adapter.list('');
      expect(objects[0]?.sizeBytes).toBe(0);
    });

    it('should handle paginated results (IsTruncated)', async () => {
      const now = new Date();
      // First page
      mockS3.send
        .mockResolvedValueOnce({
          Contents: [{ Key: 'a.json', Size: 10, LastModified: now }],
          IsTruncated: true,
          NextContinuationToken: 'token-1',
        })
        // Second page
        .mockResolvedValueOnce({
          Contents: [{ Key: 'b.json', Size: 20, LastModified: now }],
          IsTruncated: false,
        });

      const objects = await adapter.list('');
      expect(objects).toHaveLength(2);
      expect(objects.map((o) => o.key)).toEqual(['a.json', 'b.json']);
    });
  });
});
