import { describe, it, expect } from 'vitest';
import { runFormatAdapterContractTests } from '../../interfaces/format-adapter.test';
import { PoAdapter } from './po.adapter';

runFormatAdapterContractTests(
  'PoAdapter',
  () => new PoAdapter(),
  'msgid "greeting"\nmsgstr "Hello"\n\nmsgid "farewell"\nmsgstr "Goodbye"\n',
  { greeting: 'Hello', farewell: 'Goodbye' },
);

describe('PoAdapter specific', () => {
  const adapter = new PoAdapter();

  it('should skip empty msgid (PO header)', () => {
    const content = 'msgid ""\nmsgstr "header info"\n\nmsgid "key"\nmsgstr "value"\n';
    expect(adapter.parse(content)).toEqual({ key: 'value' });
  });

  it('should handle multiline msgstr', () => {
    const content = 'msgid "key"\nmsgstr "line1"\n';
    expect(adapter.parse(content)).toEqual({ key: 'line1' });
  });
});
