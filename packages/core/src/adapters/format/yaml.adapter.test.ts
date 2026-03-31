import { runFormatAdapterContractTests } from '../../interfaces/format-adapter.test';
import { YamlAdapter } from './yaml.adapter';

runFormatAdapterContractTests(
  'YamlAdapter',
  () => new YamlAdapter(),
  'auth:\n  login:\n    title: Sign In\ngreeting: Hello\n',
  { 'auth.login.title': 'Sign In', greeting: 'Hello' },
);
