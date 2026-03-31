import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiProvider } from './api.provider';

const API_URL = 'https://api.i18n-platform.com';
const API_KEY = 'test-key-123';
const PROJECT_ID = 'proj-abc';

describe('ApiProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has providerId "api"', () => {
    const provider = new ApiProvider(API_URL, API_KEY, PROJECT_ID);
    expect(provider.providerId).toBe('api');
  });

  it('loads translations without a namespace', async () => {
    const mockMap = { hello: 'Hello' };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockMap), { status: 200 }),
    );

    const provider = new ApiProvider(API_URL, API_KEY, PROJECT_ID);
    const result = await provider.load('en');

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/sdk/${PROJECT_ID}/en`,
      { headers: { Authorization: `Bearer ${API_KEY}` } },
    );
    expect(result).toEqual(mockMap);
  });

  it('loads translations with a namespace', async () => {
    const mockMap = { submit: 'Submit' };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockMap), { status: 200 }),
    );

    const provider = new ApiProvider(API_URL, API_KEY, PROJECT_ID);
    const result = await provider.load('en', 'common');

    expect(fetch).toHaveBeenCalledWith(
      `${API_URL}/sdk/${PROJECT_ID}/en/common`,
      { headers: { Authorization: `Bearer ${API_KEY}` } },
    );
    expect(result).toEqual(mockMap);
  });

  it('throws on a non-OK HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    );

    const provider = new ApiProvider(API_URL, API_KEY, PROJECT_ID);
    await expect(provider.load('en')).rejects.toThrow('404');
  });

  it('throws on a 500 server error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    const provider = new ApiProvider(API_URL, API_KEY, PROJECT_ID);
    await expect(provider.load('en', 'ui')).rejects.toThrow('500');
  });

  it('propagates network errors from fetch', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'));

    const provider = new ApiProvider(API_URL, API_KEY, PROJECT_ID);
    await expect(provider.load('en')).rejects.toThrow('Network failure');
  });
});
