/**
 * Tests for BundleGenerator.
 *
 * Covers per-locale bundle generation, per-namespace splitting, edge cases
 * (empty rows, null namespaces), and the content fidelity of produced bundles.
 *
 * @module bundle-generator.test
 */

import { describe, it, expect } from 'vitest';
import { BundleGenerator } from './bundle-generator';
import type { TranslationRow } from './bundle-generator';

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Helper: decode a bundle's Uint8Array content back to a plain object. */
function decodeBundle(content: Uint8Array): Record<string, string> {
  return JSON.parse(new TextDecoder().decode(content)) as Record<string, string>;
}

const VERSION = 'v1700000000000';

const ROWS: TranslationRow[] = [
  { key: 'common.save',        locale: 'en', value: 'Save',          namespace: 'common' },
  { key: 'common.cancel',      locale: 'en', value: 'Cancel',        namespace: 'common' },
  { key: 'auth.login.title',   locale: 'en', value: 'Log in',        namespace: 'auth'   },
  { key: 'auth.login.title',   locale: 'fr', value: 'Se connecter',  namespace: 'auth'   },
  { key: 'common.save',        locale: 'fr', value: 'Enregistrer',   namespace: 'common' },
  { key: 'noNs.key',           locale: 'en', value: 'No namespace',  namespace: null     },
];

// ── Per-locale (merged) ───────────────────────────────────────────────────────

describe('BundleGenerator — per-locale (default)', () => {
  const generator = new BundleGenerator();

  it('produces one bundle per locale', () => {
    const bundles = generator.generate(ROWS, VERSION);
    const locales = bundles.map((b) => b.locale).sort();
    expect(locales).toEqual(['en', 'fr']);
  });

  it('sets contentType to "application/json"', () => {
    const bundles = generator.generate(ROWS, VERSION);
    for (const bundle of bundles) {
      expect(bundle.contentType).toBe('application/json');
    }
  });

  it('embeds the version in the storage key', () => {
    const bundles = generator.generate(ROWS, VERSION);
    for (const bundle of bundles) {
      expect(bundle.key).toContain(VERSION);
    }
  });

  it('merges all namespaces into a single map per locale', () => {
    const bundles = generator.generate(ROWS, VERSION);
    const enBundle = bundles.find((b) => b.locale === 'en');
    expect(enBundle).toBeDefined();
    const map = decodeBundle(enBundle!.content);
    // Should contain keys from all namespaces
    expect(map['common.save']).toBe('Save');
    expect(map['auth.login.title']).toBe('Log in');
    expect(map['noNs.key']).toBe('No namespace');
  });

  it('does not set namespace on per-locale bundles', () => {
    const bundles = generator.generate(ROWS, VERSION);
    for (const bundle of bundles) {
      expect(bundle.namespace).toBeUndefined();
    }
  });

  it('uses the default "bundles" path prefix', () => {
    const bundles = generator.generate(ROWS, VERSION);
    for (const bundle of bundles) {
      expect(bundle.key.startsWith('bundles/')).toBe(true);
    }
  });

  it('respects a custom pathPrefix', () => {
    const gen = new BundleGenerator({ pathPrefix: 'projects/abc/bundles' });
    const bundles = gen.generate(ROWS, VERSION);
    for (const bundle of bundles) {
      expect(bundle.key.startsWith('projects/abc/bundles/')).toBe(true);
    }
  });

  it('returns an empty array when given no rows', () => {
    const bundles = generator.generate([], VERSION);
    expect(bundles).toHaveLength(0);
  });

  it('produces valid UTF-8 JSON content', () => {
    const bundles = generator.generate(ROWS, VERSION);
    for (const bundle of bundles) {
      expect(() => decodeBundle(bundle.content)).not.toThrow();
    }
  });
});

// ── Per-namespace split ───────────────────────────────────────────────────────

describe('BundleGenerator — splitByNamespace', () => {
  const generator = new BundleGenerator({ splitByNamespace: true });

  it('produces one bundle per (locale, namespace) pair', () => {
    const bundles = generator.generate(ROWS, VERSION);
    // en: common, auth, _ (null namespace)
    // fr: auth, common
    expect(bundles).toHaveLength(5);
  });

  it('sets namespace on each bundle', () => {
    const bundles = generator.generate(ROWS, VERSION);
    for (const bundle of bundles) {
      expect(bundle.namespace).toBeDefined();
    }
  });

  it('includes namespace in the storage key', () => {
    const bundles = generator.generate(ROWS, VERSION);
    for (const bundle of bundles) {
      expect(bundle.key).toContain(`/${bundle.namespace}/`);
    }
  });

  it('maps null namespace to "_" bucket', () => {
    const bundles = generator.generate(ROWS, VERSION);
    const noNsBundle = bundles.find(
      (b) => b.locale === 'en' && b.namespace === '_',
    );
    expect(noNsBundle).toBeDefined();
    expect(decodeBundle(noNsBundle!.content)).toEqual({ 'noNs.key': 'No namespace' });
  });

  it('scopes keys correctly per namespace', () => {
    const bundles = generator.generate(ROWS, VERSION);
    const enAuth = bundles.find(
      (b) => b.locale === 'en' && b.namespace === 'auth',
    );
    expect(enAuth).toBeDefined();
    const map = decodeBundle(enAuth!.content);
    expect(map['auth.login.title']).toBe('Log in');
    expect(map['common.save']).toBeUndefined();
  });
});
