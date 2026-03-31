/**
 * I18nProvider — creates and provides an {@link I18nInstance} to the React
 * component tree via {@link I18nContext}.
 *
 * @module provider
 */

import React, { useEffect, useRef, useState } from 'react';
import { createI18n } from '@i18n-platform/sdk-js';
import type { I18nConfig, I18nInstance } from '@i18n-platform/sdk-js';
import { I18nContext } from './context';
import type { I18nContextValue } from './context';

/** Props for {@link I18nProvider}. */
export interface I18nProviderProps {
  /** Configuration forwarded to {@link createI18n}. */
  config: I18nConfig;
  /**
   * The locale to activate immediately after the instance is created.
   * Falls back to `config.defaultLocale` when omitted.
   */
  initialLocale?: string;
  /** The component subtree that will have access to the i18n instance. */
  children: React.ReactNode;
}

/**
 * Wraps its children with an i18n context.
 *
 * Creates a single {@link I18nInstance} on mount (keyed to `config`), sets the
 * `initialLocale`, and re-renders consumers whenever the locale or loading state
 * changes by incrementing a `version` counter in the context value.
 *
 * @example
 * ```tsx
 * <I18nProvider config={{ projectId: 'my-app', defaultLocale: 'en', delivery: 'bundled', translations: { en: { hello: 'Hello' } } }}>
 *   <App />
 * </I18nProvider>
 * ```
 */
export function I18nProvider({
  config,
  initialLocale,
  children,
}: I18nProviderProps): React.ReactElement {
  // Store the i18n instance in a ref so it survives re-renders without being
  // recreated.
  const instanceRef = useRef<I18nInstance | null>(null);

  if (instanceRef.current === null) {
    instanceRef.current = createI18n(config);
  }

  const i18n = instanceRef.current;

  // `version` changes trigger re-renders of context consumers even though the
  // `i18n` object reference stays stable across renders.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);

    // Register listeners before the setLocale call so we never miss events.
    const offLocale = i18n.on('localeChange', bump);
    const offLoaded = i18n.on('loaded', bump);

    const targetLocale = initialLocale ?? config.defaultLocale;

    // Always call setLocale to ensure translations are loaded and a
    // localeChange event fires, driving the first meaningful re-render.
    void i18n.setLocale(targetLocale).then(bump);

    return () => {
      offLocale();
      offLoaded();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contextValue: I18nContextValue = { i18n, version };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}
