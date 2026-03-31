import { describe, it, expect } from 'vitest';
import { runFormatAdapterContractTests } from '../../interfaces/format-adapter.test';
import { XliffAdapter } from './xliff.adapter';

const sample = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2">
  <file source-language="en" target-language="en">
    <body>
      <trans-unit id="greeting">
        <source>Hello</source>
        <target>Hello</target>
      </trans-unit>
      <trans-unit id="farewell">
        <source>Goodbye</source>
        <target>Goodbye</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

runFormatAdapterContractTests(
  'XliffAdapter',
  () => new XliffAdapter(),
  sample,
  { greeting: 'Hello', farewell: 'Goodbye' },
);

describe('XliffAdapter specific', () => {
  const adapter = new XliffAdapter();

  it('should fall back to <source> when <target> is absent', () => {
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2">
  <file source-language="en">
    <body>
      <trans-unit id="key1">
        <source>Source only</source>
      </trans-unit>
    </body>
  </file>
</xliff>`;
    expect(adapter.parse(content)).toEqual({ key1: 'Source only' });
  });

  it('should return false for non-XLIFF content', () => {
    expect(adapter.detect('{"key": "value"}')).toBe(false);
    expect(adapter.detect('<resources><string name="a">b</string></resources>')).toBe(false);
  });

  it('should detect XLIFF content', () => {
    expect(adapter.detect(sample)).toBe(true);
    expect(adapter.detect('<xliff version="1.2">')).toBe(true);
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
    expect(serialized).toContain('<xliff');
    expect(serialized).toContain('<body>');
    const parsed = adapter.parse(serialized);
    expect(parsed).toEqual({});
  });

  it('should handle special XML characters in values', () => {
    const map = { key: 'Hello & Goodbye <world>' };
    const serialized = adapter.serialize(map);
    const parsed = adapter.parse(serialized);
    expect(parsed).toEqual(map);
  });
});
