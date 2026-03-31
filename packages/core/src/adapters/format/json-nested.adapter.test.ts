import { describe, it, expect } from 'vitest';
import { runFormatAdapterContractTests } from '../../interfaces/format-adapter.test';
import { JsonNestedAdapter } from './json-nested.adapter';

runFormatAdapterContractTests(
  'JsonNestedAdapter',
  () => new JsonNestedAdapter(),
  '{\n  "auth": {\n    "login": {\n      "title": "Sign In"\n    }\n  },\n  "greeting": "Hello"\n}',
  { 'auth.login.title': 'Sign In', greeting: 'Hello' },
);

describe('JsonNestedAdapter specific', () => {
  const adapter = new JsonNestedAdapter();

  it('should flatten deeply nested keys', () => {
    const result = adapter.parse('{"a":{"b":{"c":{"d":"deep"}}}}');
    expect(result).toEqual({ 'a.b.c.d': 'deep' });
  });

  it('should unflatten dot keys into nested structure on serialize', () => {
    const serialized = adapter.serialize({ 'a.b.c': 'value' });
    const parsed = JSON.parse(serialized);
    expect(parsed).toEqual({ a: { b: { c: 'value' } } });
  });

  it('should handle mixed top-level and nested keys', () => {
    const map = adapter.parse('{"top": "value", "nested": {"key": "value2"}}');
    expect(map).toEqual({ top: 'value', 'nested.key': 'value2' });
  });
});
