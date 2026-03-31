/**
 * Tests for the config loader.
 *
 * Mocks cosmiconfig to control what config is "found" in the filesystem.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadProjectConfig } from './config.js';

// ── Mock cosmiconfig ──────────────────────────────────────────────────────────
vi.mock('cosmiconfig', () => {
  const load = vi.fn();
  const search = vi.fn();
  return {
    cosmiconfig: vi.fn(() => ({ load, search })),
  };
});

const VALID_CONFIG = {
  projectId: '00000000-0000-0000-0000-000000000001',
  apiUrl: 'https://api.example.com',
  apiKey: 'sk-test-key',
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr'],
  namespaces: [],
  delivery: { mode: 'bundled' },
  source: {
    include: ['src/**/*.ts'],
  },
  output: {
    path: 'public/locales',
    filePattern: '{{locale}}/{{namespace}}.json',
  },
};

describe('loadProjectConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns parsed config when search finds a valid file', async () => {
    const { cosmiconfig } = await import('cosmiconfig');
    const mockedExplorer = (cosmiconfig as ReturnType<typeof vi.fn>)();
    (mockedExplorer.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      config: VALID_CONFIG,
      isEmpty: false,
      filepath: '/project/i18n.config.ts',
    });

    const config = await loadProjectConfig();
    expect(config.projectId).toBe(VALID_CONFIG.projectId);
    expect(config.apiUrl).toBe(VALID_CONFIG.apiUrl);
    expect(config.supportedLocales).toEqual(['en', 'fr']);
  });

  it('throws when no config is found', async () => {
    const { cosmiconfig } = await import('cosmiconfig');
    const mockedExplorer = (cosmiconfig as ReturnType<typeof vi.fn>)();
    (mockedExplorer.search as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(loadProjectConfig()).rejects.toThrow(
      'No i18n config found. Run `i18n init` to create one.',
    );
  });

  it('throws when config is empty', async () => {
    const { cosmiconfig } = await import('cosmiconfig');
    const mockedExplorer = (cosmiconfig as ReturnType<typeof vi.fn>)();
    (mockedExplorer.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      config: {},
      isEmpty: true,
      filepath: '/project/.i18nrc',
    });

    await expect(loadProjectConfig()).rejects.toThrow(
      'No i18n config found. Run `i18n init` to create one.',
    );
  });

  it('uses load() when configPath is provided', async () => {
    const { cosmiconfig } = await import('cosmiconfig');
    const mockedExplorer = (cosmiconfig as ReturnType<typeof vi.fn>)();
    (mockedExplorer.load as ReturnType<typeof vi.fn>).mockResolvedValue({
      config: VALID_CONFIG,
      isEmpty: false,
      filepath: '/custom/i18n.config.ts',
    });

    const config = await loadProjectConfig('/custom/i18n.config.ts');
    expect(mockedExplorer.load).toHaveBeenCalledWith('/custom/i18n.config.ts');
    expect(config.apiKey).toBe('sk-test-key');
  });

  it('throws when config fails Zod validation', async () => {
    const { cosmiconfig } = await import('cosmiconfig');
    const mockedExplorer = (cosmiconfig as ReturnType<typeof vi.fn>)();
    (mockedExplorer.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      config: { projectId: 'not-a-uuid', apiUrl: 'not-a-url', apiKey: '' },
      isEmpty: false,
      filepath: '/project/i18n.config.ts',
    });

    await expect(loadProjectConfig()).rejects.toThrow();
  });

  it('validates optional machineTranslation field', async () => {
    const { cosmiconfig } = await import('cosmiconfig');
    const mockedExplorer = (cosmiconfig as ReturnType<typeof vi.fn>)();
    (mockedExplorer.search as ReturnType<typeof vi.fn>).mockResolvedValue({
      config: {
        ...VALID_CONFIG,
        machineTranslation: {
          provider: 'deepl',
          apiKey: 'deepl-key',
        },
      },
      isEmpty: false,
      filepath: '/project/i18n.config.ts',
    });

    const config = await loadProjectConfig();
    expect(config.machineTranslation?.provider).toBe('deepl');
  });
});
