import { describe, it, expect } from 'vitest';
import type { IFormatAdapter, SerializeOptions } from './format-adapter';
import type { TranslationMap } from '../types';

/**
 * Shared contract test for any IFormatAdapter implementation.
 */
export function runFormatAdapterContractTests(
  name: string,
  createAdapter: () => IFormatAdapter,
  sampleContent: string,
  expectedMap: TranslationMap,
) {
  describe(`IFormatAdapter contract: ${name}`, () => {
    it('should have a non-empty formatId', () => {
      const adapter = createAdapter();
      expect(adapter.formatId).toBeTruthy();
      expect(typeof adapter.formatId).toBe('string');
    });

    it('should have a non-empty fileExtension', () => {
      const adapter = createAdapter();
      expect(adapter.fileExtension).toBeTruthy();
      expect(adapter.fileExtension.startsWith('.')).toBe(true);
    });

    it('should parse content into a TranslationMap', () => {
      const adapter = createAdapter();
      const result = adapter.parse(sampleContent);
      expect(result).toEqual(expectedMap);
    });

    it('should serialize a TranslationMap back to string', () => {
      const adapter = createAdapter();
      const serialized = adapter.serialize(expectedMap);
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should round-trip: parse(serialize(map)) === map', () => {
      const adapter = createAdapter();
      const serialized = adapter.serialize(expectedMap);
      const parsed = adapter.parse(serialized);
      expect(parsed).toEqual(expectedMap);
    });

    it('should detect its own format', () => {
      const adapter = createAdapter();
      expect(adapter.detect(sampleContent)).toBe(true);
    });
  });
}

describe('IFormatAdapter interface', () => {
  it('should be importable', async () => {
    const mod = await import('./format-adapter');
    expect(mod).toBeDefined();
  });
});
