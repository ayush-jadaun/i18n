/**
 * Tests for ReactExtractor.
 *
 * @module adapters/extractor/react.extractor.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ReactExtractor } from './react.extractor';

describe('ReactExtractor', () => {
  let tmpDir: string;
  let extractor: ReactExtractor;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'react-extractor-test-'));
    extractor = new ReactExtractor();
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

  it('should expose extractorId "react"', () => {
    expect(extractor.extractorId).toBe('react');
  });

  it('should expose supported file types including .tsx .jsx .ts .js', () => {
    expect(extractor.supportedFileTypes).toContain('.tsx');
    expect(extractor.supportedFileTypes).toContain('.jsx');
    expect(extractor.supportedFileTypes).toContain('.ts');
    expect(extractor.supportedFileTypes).toContain('.js');
  });

  // ---------------------------------------------------------------------------
  // Basic t() calls
  // ---------------------------------------------------------------------------

  describe('t() single-argument calls', () => {
    it('should extract a simple t("key") call', async () => {
      const file = await writeTmp('simple.tsx', `
        const greeting = t("auth.login.title");
      `);
      const result = await extractor.extract([file]);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].key).toBe('auth.login.title');
      expect(result.keys[0].filePath).toBe(file);
    });

    it('should extract a t(\'key\') call with single quotes', async () => {
      const file = await writeTmp('single-quote.tsx', `
        const label = t('nav.home');
      `);
      const result = await extractor.extract([file]);
      expect(result.keys.some(k => k.key === 'nav.home')).toBe(true);
    });

    it('should extract multiple t() calls from one file', async () => {
      const file = await writeTmp('multi.tsx', `
        const a = t("key.one");
        const b = t("key.two");
        const c = t('key.three');
      `);
      const result = await extractor.extract([file]);
      const keys = result.keys.map(k => k.key);
      expect(keys).toContain('key.one');
      expect(keys).toContain('key.two');
      expect(keys).toContain('key.three');
    });
  });

  // ---------------------------------------------------------------------------
  // t() with default value (string second arg)
  // ---------------------------------------------------------------------------

  describe('t() with string default value', () => {
    it('should extract default value from t("key", "default")', async () => {
      const file = await writeTmp('default-string.tsx', `
        const label = t("auth.submit", "Submit");
      `);
      const result = await extractor.extract([file]);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].key).toBe('auth.submit');
      expect(result.keys[0].defaultValue).toBe('Submit');
    });

    it('should extract default value with single-quoted strings', async () => {
      const file = await writeTmp('default-single.tsx', `
        const label = t('button.cancel', 'Cancel');
      `);
      const result = await extractor.extract([file]);
      expect(result.keys[0].defaultValue).toBe('Cancel');
    });
  });

  // ---------------------------------------------------------------------------
  // t() with { defaultValue: '...' }
  // ---------------------------------------------------------------------------

  describe('t() with { defaultValue } option object', () => {
    it('should extract defaultValue from t("key", { defaultValue: "text" })', async () => {
      const file = await writeTmp('default-obj.tsx', `
        const label = t("form.email", { defaultValue: "Email address" });
      `);
      const result = await extractor.extract([file]);
      expect(result.keys).toHaveLength(1);
      expect(result.keys[0].key).toBe('form.email');
      expect(result.keys[0].defaultValue).toBe('Email address');
    });

    it('should handle single-quoted defaultValue in object', async () => {
      const file = await writeTmp('default-obj-sq.tsx', `
        const label = t('form.name', { defaultValue: 'Full name' });
      `);
      const result = await extractor.extract([file]);
      expect(result.keys[0].defaultValue).toBe('Full name');
    });
  });

  // ---------------------------------------------------------------------------
  // useTranslation namespace
  // ---------------------------------------------------------------------------

  describe('useTranslation namespace inference', () => {
    it('should assign namespace from useTranslation("ns") to subsequent t() calls', async () => {
      const file = await writeTmp('with-ns.tsx', `
        const { t } = useTranslation('auth');
        const title = t('login.title');
        const btn = t('login.submit', 'Sign in');
      `);
      const result = await extractor.extract([file]);
      expect(result.keys).toHaveLength(2);
      result.keys.forEach(k => {
        expect(k.namespace).toBe('auth');
      });
    });

    it('should use double-quoted namespace from useTranslation', async () => {
      const file = await writeTmp('with-ns-dq.tsx', `
        const { t } = useTranslation("common");
        const label = t('button.ok');
      `);
      const result = await extractor.extract([file]);
      expect(result.keys[0].namespace).toBe('common');
    });

    it('should set no namespace when useTranslation is not called', async () => {
      const file = await writeTmp('no-ns.tsx', `
        const label = t('standalone.key');
      `);
      const result = await extractor.extract([file]);
      expect(result.keys[0].namespace).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Line and column info
  // ---------------------------------------------------------------------------

  describe('line and column tracking', () => {
    it('should record the correct 1-based line number', async () => {
      const file = await writeTmp('line-info.tsx', `const a = 1;
const b = 2;
const label = t("my.key");`);
      const result = await extractor.extract([file]);
      expect(result.keys[0].line).toBe(3);
    });

    it('should record a positive 1-based column number', async () => {
      const file = await writeTmp('col-info.tsx', `const label = t("col.key");`);
      const result = await extractor.extract([file]);
      expect(result.keys[0].column).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Dynamic keys (warnings)
  // ---------------------------------------------------------------------------

  describe('dynamic key warnings', () => {
    it('should warn on a dynamic key like t(variable)', async () => {
      const file = await writeTmp('dynamic.tsx', `
        const key = getKey();
        const label = t(key);
      `);
      const result = await extractor.extract([file]);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].filePath).toBe(file);
    });

    it('should warn on template literal key t(`prefix.${var}`)', async () => {
      const file = await writeTmp('template-key.tsx', `
        const label = t(\`prefix.\${dynamicPart}\`);
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
      const file1 = await writeTmp('file1.tsx', `const a = t("key.alpha");`);
      const file2 = await writeTmp('file2.tsx', `const b = t("key.beta");`);
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
    it('should return empty result for a file with no t() calls', async () => {
      const file = await writeTmp('empty.tsx', `
        const x = 1;
        function hello() { return 'world'; }
      `);
      const result = await extractor.extract([file]);
      expect(result.keys).toEqual([]);
    });

    it('should not emit a warning for static string keys', async () => {
      const file = await writeTmp('static.tsx', `
        const label = t("auth.title");
      `);
      const result = await extractor.extract([file]);
      expect(result.warnings).toEqual([]);
    });
  });
});
