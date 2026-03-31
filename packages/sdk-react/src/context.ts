/**
 * React context that carries the active {@link I18nInstance} and a version
 * counter down the component tree.
 *
 * Consume via {@link useTranslation} rather than this context directly.
 *
 * @module context
 */

import { createContext } from 'react';
import type { I18nInstance } from '@i18n-platform/sdk-js';

/**
 * The value shape stored in {@link I18nContext}.
 *
 * `version` is incremented each time the locale or loading state changes,
 * causing context consumers to re-render even though the `i18n` object
 * reference stays stable.
 */
export interface I18nContextValue {
  /** The active i18n instance. */
  i18n: I18nInstance;
  /**
   * Monotonically increasing counter that is bumped on every locale or load
   * state change, forcing context consumers to re-render.
   */
  version: number;
}

/**
 * The React context object holding the current {@link I18nContextValue}.
 *
 * The default value is `null`; the context must always be provided by
 * wrapping your application (or the relevant sub-tree) in
 * {@link I18nProvider}.
 */
export const I18nContext = createContext<I18nContextValue | null>(null);
