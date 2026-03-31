/**
 * Tests for VanillaJsExtractor.
 *
 * @module adapters/extractor/vanilla-js.extractor.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { VanillaJsExtractor } from './vanilla-js.extractor';

describe('VanillaJsExtractor', () => {
  let tmpDir: string;
  let extractor: VanillaJsExtractor;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vanilla-extractor-test-'));
    extractor = new VanillaJsExtractor();
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const writeTmp = async (filename: string, content: string): Promise<string> => {
    const filePath = path.join(tmpDir, filename);
    await fs.writeFile(filePath, content, 'utf-8');
    return filePath;
  };

  // ---------------------------------------------------------------------------
  // Identity properties
  // ---------------------------------------------------------------------------

  it('should expose extractorId "vanilla-js"', () => {
    expect(extractor.extractorId).toBe('vanilla-js');
  });

  it('should expose supported file types including .ts .js .mjs .cjs', () => {
    expect(extractor.supportedFileTypes).toContain('.ts');
    expect(extractor.supportedFileTypes).toContain('.js');
    expect(extractor.supportedFileTypes).toContain('.mjs');
    expect(extractor.supportedFileTypes).toContain('.cjs');
  });

  // ---------------------------------------------------------------------------
  // i18n.t() calls
  // ---------------------------------------------------------------------------

  describe('i18n.t() calls', () => {
    it('should extract a simple i18n.t("key") call with double quotes', async () => {
      const file = await writeTmp('basic.ts', `
        const label = i18n.t("auth.login.title");
      `);
      const result = await extractor.extract([file]);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].key).toBe('auth.login.title');
      expect(result.keys[0].filePath).toBe(file);
    });

    it('should extract a simple i18n.t(\'key\') call with single quotes', async () => {
      const file = await writeTmp('single-quote.ts', `
        const label = i18n.t('nav.home');
      `);
      const result = await extractor.extract([file]);
      expect(result.keys.some(k => k.key === 'nav.home')).toBe(true);
    });

    it('should extract multiple i18n.t() calls from one file', async () => {
      const file = await writeTmp('multi.js', `
        const a = i18n.t("key.one");
        const b = i18n.t("key.two");
        const c = i18n.t('key.three');
      `);
      const result = await extractor.extract([file]);
      const keys = result.keys.map(k => k.key);
      expect(keys).toContain('key.one');
      expect(keys).toContain('key.two');
      expect(keys).toContain('key.three');
    });

    it('should work in .mjs files', async () => {
      const file = await writeTmp('module.mjs', `
        export const title = i18n.t('page.title');
      `);
      const result = await extractor.extract([file]);
      expect(result.keys.some(k => k.key === 'page.title')).toBe(true);
    });

    it('should work in .cjs files', async () => {
      const file = await writeTmp('module.cjs', `
        const label = i18n.t('common.ok');
      `);
      const result = await extractor.extract([file]);
      expect(result.keys.some(k => k.key === 'common.ok')).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Line and column info
  // ---------------------------------------------------------------------------

  describe('line and column tracking', () => {
    it('should record the correct 1-based line number', async () => {
      const file = await writeTmp('line-info.js', `const a = 1;
const b = 2;
const label = i18n.t("my.key");`);
      const result = await extractor.extract([file]);
      expect(result.keys[0].line).toBe(3);
    });

    it('should record a positive 1-based column number', async () => {
      const file = await writeTmp('col-info.js', `const label = i18n.t("col.key");`);
      const result = await extractor.extract([file]);
      expect(result.keys[0].column).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Dynamic keys (warnings)
  // ---------------------------------------------------------------------------

  describe('dynamic key warnings', () => {
    it('should warn on a dynamic key like i18n.t(variable)', async () => {
      const file = await writeTmp('dynamic.js', `
        const key = getKey();
        const label = i18n.t(key);
      `);
      const result = await extractor.extract([file]);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].filePath).toBe(file);
    });

    it('should warn on template literal key i18n.t(`prefix.${var}`)', async () => {
      const file = await writeTmp('template-key.js', `
        const label = i18n.t(\`prefix.\${dynamicPart}\`);
      `);
      const result = await extractor.extract([file]);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple files
  // ---------------------------------------------------------------------------

  describe('multiple file extraction', () => {
    it('should aggregate keys across multiple files', async () => {
      const file1 = await writeTmp('f1.ts', `const a = i18n.t("key.alpha");`);
      const file2 = await writeTmp('f2.ts', `const b = i18n.t("key.beta");`);
      const result = await extractor.extract([file1, file2]);
      const keys = result.keys.map(k => k.key);
      expect(keys).toContain('key.alpha');
      expect(keys).toContain('key.beta');
    });

    it('should handle an empty file array', async () => {
      const result = await extractor.extract([]);
      expect(result.keys).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should return empty result for a file with no i18n.t() calls', async () => {
      const file = await writeTmp('no-calls.ts', `
        const x = 1;
        function hello() { return 'world'; }
      `);
      const result = await extractor.extract([file]);
      expect(result.keys).toEqual([]);
    });

    it('should NOT extract plain t() calls (only i18n.t())', async () => {
      const file = await writeTmp('plain-t.ts', `
        const label = t("some.key");
      `);
      const result = await extractor.extract([file]);
      // VanillaJsExtractor only looks for i18n.t(), not bare t()
      expect(result.keys).toHaveLength(0);
    });

    it('should not emit a warning for static string keys', async () => {
      const file = await writeTmp('static.ts', `
        const label = i18n.t("auth.title");
      `);
      const result = await extractor.extract([file]);
      expect(result.warnings).toEqual([]);
    });
  });
});
