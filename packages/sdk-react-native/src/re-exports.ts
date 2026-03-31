/**
 * Internal re-export shim — collects all symbols re-exported from the
 * React SDK so they can be surfaced under a single import in this package.
 *
 * @internal
 */

export {
  I18nProvider,
  I18nContext,
  useTranslation,
  Trans,
  LocaleSwitcher,
} from '@i18n-platform/sdk-react';

export type {
  I18nProviderProps,
  UseTranslationResult,
  TransProps,
  LocaleSwitcherProps,
} from '@i18n-platform/sdk-react';
