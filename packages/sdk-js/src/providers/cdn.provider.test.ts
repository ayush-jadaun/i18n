import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CdnProvider } from './cdn.provider';

const CDN_URL = 'https://cdn.i18n-platform.com';
const PROJECT_ID = 'proj-xyz';

describe('CdnProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('has providerId "cdn"', () => {
    const provider = new CdnProvider(CDN_URL, PROJECT_ID);
    expect(provider.providerId).toBe('cdn');
  });

  it('loads translations without a namespace', async () => {
    const mockMap = { title: 'Home' };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockMap), { status: 200 }),
    );

    const provider = new CdnProvider(CDN_URL, PROJECT_ID);
    const result = await provider.load('en');

    expect(fetch).toHaveBeenCalledWith(
      `${CDN_URL}/${PROJECT_ID}/latest/en.json`,
    );
    expect(result).toEqual(mockMap);
  });

  it('loads translations with a namespace', async () => {
    const mockMap = { cancel: 'Cancel' };
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(mockMap), { status: 200 }),
    );

    const provider = new CdnProvider(CDN_URL, PROJECT_ID);
    const result = await provider.load('fr', 'common');

    expect(fetch).toHaveBeenCalledWith(
      `${CDN_URL}/${PROJECT_ID}/latest/fr/common.json`,
    );
    expect(result).toEqual(mockMap);
  });

  it('throws on a non-OK HTTP response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    );

    const provider = new CdnProvider(CDN_URL, PROJECT_ID);
    await expect(provider.load('de')).rejects.toThrow('404');
  });

  it('throws on a 503 error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response('Service Unavailable', { status: 503 }),
    );

    const provider = new CdnProvider(CDN_URL, PROJECT_ID);
    await expect(provider.load('en', 'app')).rejects.toThrow('503');
  });

  it('propagates network errors from fetch', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const provider = new CdnProvider(CDN_URL, PROJECT_ID);
    await expect(provider.load('en')).rejects.toThrow('Failed to fetch');
  });
});
