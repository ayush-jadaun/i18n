/**
 * Tests for VersionManager.
 *
 * Covers version string generation format, monotonicity, and the creation of
 * "latest" alias bundles from versioned bundles.
 *
 * @module version-manager.test
 */

import { describe, it, expect } from 'vitest';
import { VersionManager } from './version-manager';
import type { TranslationBundle } from './bundle-generator';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeBundle(key: string, locale: string, namespace?: string): TranslationBundle {
  return {
    key,
    content: new TextEncoder().encode('{}'),
    contentType: 'application/json',
    locale,
    namespace,
  };
}

// ── generateVersion ───────────────────────────────────────────────────────────

describe('VersionManager.generateVersion', () => {
  const vm = new VersionManager();

  it('returns a string starting with "v"', () => {
    const version = vm.generateVersion();
    expect(version.startsWith('v')).toBe(true);
  });

  it('the suffix after "v" is a valid integer (milliseconds)', () => {
    const version = vm.generateVersion();
    const ms = Number(version.slice(1));
    expect(Number.isInteger(ms)).toBe(true);
    expect(ms).toBeGreaterThan(0);
  });

  it('successive calls produce monotonically non-decreasing versions', () => {
    const a = vm.generateVersion();
    const b = vm.generateVersion();
    expect(Number(b.slice(1))).toBeGreaterThanOrEqual(Number(a.slice(1)));
  });

  it('matches the pattern /^v\\d+$/', () => {
    const version = vm.generateVersion();
    expect(version).toMatch(/^v\d+$/);
  });
});

// ── createLatestAliases ───────────────────────────────────────────────────────

describe('VersionManager.createLatestAliases', () => {
  const vm = new VersionManager();

  it('returns the same number of aliases as input bundles', () => {
    const bundles = [
      makeBundle('bundles/en/v1700000000000.json', 'en'),
      makeBundle('bundles/fr/v1700000000000.json', 'fr'),
    ];
    expect(vm.createLatestAliases(bundles)).toHaveLength(2);
  });

  it('replaces versioned filename with "latest.json"', () => {
    const bundle = makeBundle('bundles/en/v1700000000000.json', 'en');
    const [alias] = vm.createLatestAliases([bundle]);
    expect(alias!.key).toBe('bundles/en/latest.json');
  });

  it('handles namespace sub-paths correctly', () => {
    const bundle = makeBundle('bundles/en/auth/v1700000000000.json', 'en', 'auth');
    const [alias] = vm.createLatestAliases([bundle]);
    expect(alias!.key).toBe('bundles/en/auth/latest.json');
  });

  it('preserves locale from the source bundle', () => {
    const bundle = makeBundle('bundles/fr/v1700000000000.json', 'fr');
    const [alias] = vm.createLatestAliases([bundle]);
    expect(alias!.locale).toBe('fr');
  });

  it('preserves namespace from the source bundle', () => {
    const bundle = makeBundle('bundles/en/common/v1700000000000.json', 'en', 'common');
    const [alias] = vm.createLatestAliases([bundle]);
    expect(alias!.namespace).toBe('common');
  });

  it('preserves content bytes from the source bundle', () => {
    const content = new TextEncoder().encode('{"hello":"world"}');
    const bundle: TranslationBundle = {
      key: 'bundles/en/v1700000000000.json',
      content,
      contentType: 'application/json',
      locale: 'en',
    };
    const [alias] = vm.createLatestAliases([bundle]);
    expect(alias!.content).toBe(content);
  });

  it('sets aliasOf to the version string extracted from the key', () => {
    const bundle = makeBundle('bundles/en/v1700000000000.json', 'en');
    const [alias] = vm.createLatestAliases([bundle]);
    expect(alias!.aliasOf).toBe('v1700000000000');
  });

  it('returns an empty array when given no bundles', () => {
    expect(vm.createLatestAliases([])).toHaveLength(0);
  });
});
