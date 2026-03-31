import { runFormatAdapterContractTests } from '../../interfaces/format-adapter.test';
import { JsonFlatAdapter } from './json-flat.adapter';

runFormatAdapterContractTests(
  'JsonFlatAdapter',
  () => new JsonFlatAdapter(),
  '{\n  "greeting": "Hello",\n  "farewell": "Goodbye"\n}',
  { greeting: 'Hello', farewell: 'Goodbye' },
);
