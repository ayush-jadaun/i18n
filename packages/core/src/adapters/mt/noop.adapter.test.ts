/**
 * Tests for NoOpMtAdapter.
 *
 * @module adapters/mt/noop.adapter.test
 */

import { describe, it, expect } from 'vitest';
import { NoOpMtAdapter } from './noop.adapter';

describe('NoOpMtAdapter', () => {
  let adapter: NoOpMtAdapter;

  beforeEach(() => {
    adapter = new NoOpMtAdapter();
  });

  // ---------------------------------------------------------------------------
  // Identity properties
  // ---------------------------------------------------------------------------

  it('should expose providerId "noop"', () => {
    expect(adapter.providerId).toBe('noop');
  });

  it('should expose an empty supportedLocales array', () => {
    expect(adapter.supportedLocales).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // translate
  // ---------------------------------------------------------------------------

  describe('translate', () => {
    it('should return an empty translatedText', async () => {
      const result = await adapter.translate({
        text: 'Hello world',
        sourceLocale: 'en',
        targetLocale: 'fr',
      });
      expect(result.translatedText).toBe('');
    });

    it('should return provider "noop"', async () => {
      const result = await adapter.translate({
        text: 'Hello',
        sourceLocale: 'en',
        targetLocale: 'de',
      });
      expect(result.providerId).toBe('noop');
    });

    it('should return null qualityScore', async () => {
      const result = await adapter.translate({
        text: 'Hello',
        sourceLocale: 'en',
        targetLocale: 'ja',
      });
      expect(result.qualityScore).toBeUndefined();
    });

    it('should return 0 charactersBilled', async () => {
      const result = await adapter.translate({
        text: 'Hello',
        sourceLocale: 'en',
        targetLocale: 'es',
      });
      expect(result.charactersBilled).toBe(0);
    });

    it('should return 0 estimatedCostUsd', async () => {
      const result = await adapter.translate({
        text: 'Long text here',
        sourceLocale: 'en',
        targetLocale: 'zh',
      });
      expect(result.estimatedCostUsd).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // translateBatch
  // ---------------------------------------------------------------------------

  describe('translateBatch', () => {
    it('should return an empty results object', async () => {
      const result = await adapter.translateBatch({
        items: [
          { key: 'greeting', text: 'Hello' },
          { key: 'farewell', text: 'Goodbye' },
        ],
        sourceLocale: 'en',
        targetLocale: 'fr',
      });
      expect(result.results).toEqual({});
    });

    it('should return provider "noop"', async () => {
      const result = await adapter.translateBatch({
        items: [],
        sourceLocale: 'en',
        targetLocale: 'de',
      });
      expect(result.providerId).toBe('noop');
    });

    it('should return 0 totalCharactersBilled', async () => {
      const result = await adapter.translateBatch({
        items: [{ key: 'k', text: 'some text' }],
        sourceLocale: 'en',
        targetLocale: 'es',
      });
      expect(result.totalCharactersBilled).toBe(0);
    });

    it('should return 0 totalEstimatedCostUsd', async () => {
      const result = await adapter.translateBatch({
        items: [{ key: 'k', text: 'some text' }],
        sourceLocale: 'en',
        targetLocale: 'es',
      });
      expect(result.totalEstimatedCostUsd).toBe(0);
    });

    it('should handle empty items array', async () => {
      const result = await adapter.translateBatch({
        items: [],
        sourceLocale: 'en',
        targetLocale: 'fr',
      });
      expect(result.results).toEqual({});
      expect(result.totalCharactersBilled).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // estimateCost
  // ---------------------------------------------------------------------------

  describe('estimateCost', () => {
    it('should return providerId "noop"', async () => {
      const result = await adapter.estimateCost({
        text: 'Some text',
        sourceLocale: 'en',
        targetLocale: 'fr',
      });
      expect(result.providerId).toBe('noop');
    });

    it('should return 0 characterCount', async () => {
      const result = await adapter.estimateCost({
        text: 'Some text',
        sourceLocale: 'en',
        targetLocale: 'fr',
      });
      expect(result.characterCount).toBe(0);
    });

    it('should return 0 estimatedCostUsd', async () => {
      const result = await adapter.estimateCost({
        text: 'Some text',
        sourceLocale: 'en',
        targetLocale: 'fr',
      });
      expect(result.estimatedCostUsd).toBe(0);
    });

    it('should return currency "USD"', async () => {
      const result = await adapter.estimateCost({
        text: 'Any text',
        sourceLocale: 'en',
        targetLocale: 'de',
      });
      expect(result.currency).toBe('USD');
    });
  });
});
