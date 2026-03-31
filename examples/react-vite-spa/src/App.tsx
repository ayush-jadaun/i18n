/**
 * Root application component for the React Vite SPA i18n example.
 *
 * Sets up {@link I18nProvider} and renders translation examples including:
 *  - Greeting with `{name}` interpolation
 *  - Plural-aware item count
 *  - Locale switching
 *
 * @module App
 */

import React, { useState } from 'react';
import { I18nProvider, useTranslation, LocaleSwitcher } from '@i18n-platform/sdk-react';
import { i18nConfig, SUPPORTED_LOCALES } from './i18n/config';

/**
 * Inner content component — must be rendered inside `<I18nProvider>` so that
 * {@link useTranslation} can access the i18n context.
 *
 * @returns Translated UI demonstrating the SDK features
 */
function Content(): React.ReactElement {
  const { t, locale, isLoading } = useTranslation();

  /** Number of items used to demonstrate pluralization. */
  const [itemCount, setItemCount] = useState(1);

  if (isLoading) {
    return <p>Loading translations…</p>;
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '48px auto', padding: '0 16px' }}>
      {/* Header */}
      <h1>{t('welcome')}</h1>
      <p>{t('description')}</p>

      {/* Locale switcher */}
      <section style={{ marginBottom: 24 }}>
        <label>
          {t('language')}:{' '}
          <LocaleSwitcher locales={[...SUPPORTED_LOCALES]} />
        </label>
        <p style={{ color: '#666', fontSize: 14 }}>Active locale: <code>{locale}</code></p>
      </section>

      {/* Interpolation */}
      <section style={{ marginBottom: 24 }}>
        <h2>Interpolation</h2>
        <p>{t('greeting', { name: 'Alice' })}</p>
      </section>

      {/* Pluralization */}
      <section style={{ marginBottom: 24 }}>
        <h2>Pluralization</h2>
        <p>{t('items_count', { count: itemCount })}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => setItemCount((c) => Math.max(0, c - 1))}>–</button>
          <span>{itemCount}</span>
          <button onClick={() => setItemCount((c) => c + 1)}>+</button>
        </div>
      </section>

      {/* Navigation labels */}
      <section>
        <h2>Navigation</h2>
        <ul>
          <li>{t('nav.home')}</li>
          <li>{t('nav.about')}</li>
          <li>{t('nav.settings')}</li>
        </ul>
      </section>
    </main>
  );
}

/**
 * Root component — provides the i18n context to the entire component tree.
 *
 * @returns The application wrapped in {@link I18nProvider}
 */
export default function App(): React.ReactElement {
  return (
    <I18nProvider config={i18nConfig}>
      <Content />
    </I18nProvider>
  );
}
