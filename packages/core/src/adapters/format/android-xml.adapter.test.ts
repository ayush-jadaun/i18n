import { describe, it, expect } from 'vitest';
import { runFormatAdapterContractTests } from '../../interfaces/format-adapter.test';
import { AndroidXmlAdapter } from './android-xml.adapter';

const sample = `<?xml version="1.0" encoding="UTF-8"?>
<resources>
  <string name="greeting">Hello</string>
  <string name="farewell">Goodbye</string>
</resources>`;

runFormatAdapterContractTests(
  'AndroidXmlAdapter',
  () => new AndroidXmlAdapter(),
  sample,
  { greeting: 'Hello', farewell: 'Goodbye' },
);

describe('AndroidXmlAdapter specific', () => {
  const adapter = new AndroidXmlAdapter();

  it('should return false for non-Android XML content', () => {
    expect(adapter.detect('{"key": "value"}')).toBe(false);
    expect(adapter.detect('"key" = "value";')).toBe(false);
    expect(adapter.detect('<xliff version="1.2"></xliff>')).toBe(false);
  });

  it('should return false for resources tag without string children', () => {
    expect(adapter.detect('<resources></resources>')).toBe(false);
  });

  it('should detect Android XML content', () => {
    expect(adapter.detect(sample)).toBe(true);
    expect(adapter.detect('<resources>\n  <string name="a">b</string>\n</resources>')).toBe(true);
  });

  it('should handle sortKeys option during serialization', () => {
    const map = { z_key: 'Z', a_key: 'A' };
    const serialized = adapter.serialize(map, { sortKeys: true });
    const indexA = serialized.indexOf('a_key');
    const indexZ = serialized.indexOf('z_key');
    expect(indexA).toBeLessThan(indexZ);
  });

  it('should handle empty map serialization', () => {
    const serialized = adapter.serialize({});
    expect(serialized).toContain('<resources>');
    const parsed = adapter.parse(serialized);
    expect(parsed).toEqual({});
  });

  it('should handle special XML characters in values', () => {
    const map = { key: 'Hello & <World>' };
    const serialized = adapter.serialize(map);
    const parsed = adapter.parse(serialized);
    expect(parsed).toEqual(map);
  });
});
