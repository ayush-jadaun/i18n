import { describe, it, expect } from 'vitest';
import { runFormatAdapterContractTests } from '../../interfaces/format-adapter.test';
import { IosStringsAdapter } from './ios-strings.adapter';

const sample = `"greeting" = "Hello";
"farewell" = "Goodbye";`;

runFormatAdapterContractTests(
  'IosStringsAdapter',
  () => new IosStringsAdapter(),
  sample,
  { greeting: 'Hello', farewell: 'Goodbye' },
);

describe('IosStringsAdapter specific', () => {
  const adapter = new IosStringsAdapter();

  it('should return false for non-iOS Strings content', () => {
    expect(adapter.detect('{"key": "value"}')).toBe(false);
    expect(adapter.detect('<resources><string name="a">b</string></resources>')).toBe(false);
    expect(adapter.detect('<xliff version="1.2"></xliff>')).toBe(false);
  });

  it('should detect iOS Strings content', () => {
    expect(adapter.detect(sample)).toBe(true);
    expect(adapter.detect('"key" = "value";')).toBe(true);
  });

  it('should skip comment lines', () => {
    const content = `/* Greeting */
"greeting" = "Hello";
// Another comment
"farewell" = "Goodbye";`;
    expect(adapter.parse(content)).toEqual({ greeting: 'Hello', farewell: 'Goodbye' });
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
    expect(typeof serialized).toBe('string');
    const parsed = adapter.parse(serialized);
    expect(parsed).toEqual({});
  });

  it('should handle escaped double-quotes in values', () => {
    const map = { key: 'Say "hello"' };
    const serialized = adapter.serialize(map);
    const parsed = adapter.parse(serialized);
    expect(parsed).toEqual(map);
  });

  it('should handle escaped double-quotes in keys', () => {
    const content = '"key\\"1" = "value";';
    const parsed = adapter.parse(content);
    expect(parsed).toEqual({ 'key"1': 'value' });
  });
});
