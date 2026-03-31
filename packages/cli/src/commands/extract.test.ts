/**
 * Tests for the `extract` command.
 *
 * File-system access and glob are mocked so no real files are read.
 * The ReactExtractor is also mocked to return controlled results.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Command } from 'commander';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../config.js', () => ({
  loadProjectConfig: vi.fn(),
}));

vi.mock('@i18n-platform/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@i18n-platform/core')>();
  return {
    ...actual,
    ReactExtractor: vi.fn().mockImplementation(() => ({
      extractorId: 'react',
      supportedFileTypes: ['.tsx', '.jsx', '.ts', '.js'],
      extract: vi.fn().mockResolvedValue({ keys: [], warnings: [] }),
    })),
    VanillaJsExtractor: vi.fn().mockImplementation(() => ({
      extractorId: 'vanilla-js',
      supportedFileTypes: ['.ts', '.js', '.mjs', '.cjs'],
      extract: vi.fn().mockResolvedValue({ keys: [], warnings: [] }),
    })),
  };
});

// Suppress glob so resolveSourceFiles returns empty (no real FS needed)
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    glob: vi.fn().mockImplementation(async function* () {
      // yields nothing by default
    }),
  };
});

const VALID_CONFIG = {
  projectId: '00000000-0000-0000-0000-000000000001',
  apiUrl: 'https://api.example.com',
  apiKey: 'sk-test',
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr'],
  namespaces: [],
  delivery: { mode: 'bundled' },
  source: { include: ['src/**/*.ts'], defaultNamespace: 'common' },
  output: { path: 'public/locales', filePattern: '{{locale}}/{{namespace}}.json' },
};

describe('registerExtractCommand', () => {
  let mockConfig: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const configModule = await import('../config.js');
    mockConfig = configModule.loadProjectConfig as ReturnType<typeof vi.fn>;
    mockConfig.mockResolvedValue(VALID_CONFIG);
  });

  it('loads config without error when no files match', async () => {
    // Should not throw even when no files are found
    const { registerExtractCommand } = await import('./extract.js');
    const program = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    } as unknown as Command;

    expect(() => registerExtractCommand(program)).not.toThrow();
    expect(program.command).toHaveBeenCalledWith('extract');
  });

  it('registers description and options', async () => {
    const { registerExtractCommand } = await import('./extract.js');
    const options: Array<[string, string]> = [];
    const program = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockImplementation((flag: string, desc: string) => {
        options.push([flag, desc]);
        return program;
      }),
      action: vi.fn().mockReturnThis(),
    } as unknown as Command;

    registerExtractCommand(program);

    expect(program.description).toHaveBeenCalledWith(
      expect.stringContaining('Extract'),
    );
    expect(options.some(([f]) => f.includes('--json'))).toBe(true);
    expect(options.some(([f]) => f.includes('--config'))).toBe(true);
  });

  it('calls loadProjectConfig with explicit path when --config is provided', async () => {
    const { registerExtractCommand } = await import('./extract.js');

    let capturedAction: (opts: unknown) => Promise<void> = async () => undefined;
    const program = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockImplementation((fn) => { capturedAction = fn; return program; }),
    } as unknown as Command;

    registerExtractCommand(program);

    // Invoke the action with a config path
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    try {
      await capturedAction({ config: '/custom/i18n.config.ts', json: false });
    } catch {
      // process.exit throws in test
    }

    expect(mockConfig).toHaveBeenCalledWith('/custom/i18n.config.ts');
  });

  it('outputs JSON to stdout when --json flag is set', async () => {
    // This test verifies that the extract action outputs valid JSON when
    // no keys are found (empty result). Both extractors are mocked to return
    // empty arrays (default mock from module-level vi.mock).
    const { registerExtractCommand } = await import('./extract.js');
    let capturedAction: (opts: unknown) => Promise<void> = async () => undefined;
    const program = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockImplementation((fn) => {
        capturedAction = fn as typeof capturedAction;
        return program;
      }),
    } as unknown as Command;

    registerExtractCommand(program);

    const loggedLines: string[] = [];
    const consoleSpy = vi
      .spyOn(console, 'log')
      .mockImplementation((...args) => { loggedLines.push(String(args[0])); });

    await capturedAction({ json: true });
    consoleSpy.mockRestore();

    // With --json and no keys the action should still log JSON with keys: []
    expect(loggedLines.length).toBeGreaterThan(0);
    const jsonOutput = loggedLines.find((l) => {
      try { JSON.parse(l); return true; }
      catch { return false; }
    });
    expect(jsonOutput).toBeDefined();
    const parsed = JSON.parse(jsonOutput!) as { keys: unknown[]; warnings: unknown[] };
    expect(Array.isArray(parsed.keys)).toBe(true);
    expect(Array.isArray(parsed.warnings)).toBe(true);
  });
});
