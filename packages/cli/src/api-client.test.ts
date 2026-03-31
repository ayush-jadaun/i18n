/**
 * Tests for the ApiClient.
 *
 * Native `fetch` is mocked via vi.stubGlobal so no network calls are made.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, ApiError } from './api-client.js';

/** Creates a minimal mock Response object. */
function mockResponse(
  body: unknown,
  status = 200,
  ok = true,
): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('ApiClient', () => {
  const BASE_URL = 'https://api.example.com';
  const API_KEY = 'sk-test';
  let client: ApiClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new ApiClient(BASE_URL, API_KEY);
  });

  // ── GET ────────────────────────────────────────────────────────────────────
  describe('get()', () => {
    it('calls the correct URL with Authorization header', async () => {
      fetchMock.mockResolvedValue(mockResponse({ id: '1' }));

      await client.get('/projects');

      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/projects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
      });
    });

    it('returns parsed JSON body', async () => {
      const data = [{ key: 'greeting', value: 'Hello' }];
      fetchMock.mockResolvedValue(mockResponse(data));

      const result = await client.get<typeof data>('/keys');
      expect(result).toEqual(data);
    });

    it('throws ApiError on non-2xx response', async () => {
      fetchMock.mockResolvedValue(mockResponse('Not Found', 404, false));

      await expect(client.get('/missing')).rejects.toThrow(ApiError);
      await expect(client.get('/missing')).rejects.toMatchObject({ status: 404 });
    });
  });

  // ── POST ───────────────────────────────────────────────────────────────────
  describe('post()', () => {
    it('sends JSON body', async () => {
      fetchMock.mockResolvedValue(mockResponse({ created: true }));
      const payload = { keys: [{ key: 'hello' }] };

      await client.post('/keys', payload);

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE_URL}/keys`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        }),
      );
    });

    it('throws ApiError on 400', async () => {
      fetchMock.mockResolvedValue(mockResponse('Bad Request', 400, false));

      await expect(client.post('/keys', {})).rejects.toThrow(ApiError);
    });
  });

  // ── PUT ────────────────────────────────────────────────────────────────────
  describe('put()', () => {
    it('sends PUT with JSON body', async () => {
      fetchMock.mockResolvedValue(mockResponse({ updated: true }));
      const payload = { name: 'New Name' };

      await client.put('/projects/1', payload);

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE_URL}/projects/1`,
        expect.objectContaining({ method: 'PUT', body: JSON.stringify(payload) }),
      );
    });
  });

  // ── PATCH ──────────────────────────────────────────────────────────────────
  describe('patch()', () => {
    it('sends PATCH with JSON body', async () => {
      fetchMock.mockResolvedValue(mockResponse({ patched: true }));

      await client.patch('/projects/1/settings', { sortKeys: true });

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE_URL}/projects/1/settings`,
        expect.objectContaining({ method: 'PATCH' }),
      );
    });
  });

  // ── DELETE ─────────────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('sends DELETE request', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') } as Response);

      await client.delete('/keys/abc');

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE_URL}/keys/abc`,
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('throws ApiError on 403', async () => {
      fetchMock.mockResolvedValue(
        mockResponse('Forbidden', 403, false),
      );

      await expect(client.delete('/keys/abc')).rejects.toThrow(ApiError);
    });
  });

  // ── ApiError ───────────────────────────────────────────────────────────────
  describe('ApiError', () => {
    it('includes status code in message', async () => {
      fetchMock.mockResolvedValue(mockResponse('Unauthorized', 401, false));

      try {
        await client.get('/protected');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(401);
        expect((err as ApiError).message).toContain('401');
      }
    });
  });
});
