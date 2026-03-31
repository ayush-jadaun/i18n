/**
 * Home page for the Next.js App Router i18n example.
 *
 * Demonstrates:
 *  - Simple key lookup via `t()`
 *  - Interpolation: `t('greeting', { name: 'Alice' })`
 *  - Pluralization: `t('items_count', { count: n })`
 *  - Locale switching via the {@link LocaleSwitcher} component
 *
 * This file uses `"use client"` because it calls {@link useTranslation}, which
 * depends on React context and state.
 *
 * @module app/page
 */

'use client';

import React, { useState } from 'react';
import { useTranslation, LocaleSwitcher } from '@i18n-platform/sdk-react';
import { SUPPORTED_LOCALES } from '@/i18n/config';

/**
 * Home page component.
 *
 * @returns The rendered home page with translation examples
 */
export default function HomePage(): React.ReactElement {
  const { t, locale, isLoading } = useTranslation();

  /** Number of items used to demonstrate pluralization. */
  const [itemCount, setItemCount] = useState(1);

  if (isLoading) {
    return <main><p>Loading translations…</p></main>;
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '48px auto', padding: '0 16px' }}>
      {/* Header */}
      <h1>{t('welcome')}</h1>
      <p>{t('description')}</p>

      {/* Locale switcher */}
      <section style={{ marginBottom: 24 }}>
        <label htmlFor="locale-select">
          {t('language')}:{' '}
          <LocaleSwitcher
            locales={[...SUPPORTED_LOCALES]}
            className="locale-select"
          />
        </label>
        <p style={{ color: '#666', fontSize: 14 }}>Active locale: <code>{locale}</code></p>
      </section>

      {/* Interpolation example */}
      <section style={{ marginBottom: 24 }}>
        <h2>Interpolation</h2>
        <p>{t('greeting', { name: 'Alice' })}</p>
      </section>

      {/* Pluralization example */}
      <section style={{ marginBottom: 24 }}>
        <h2>Pluralization</h2>
        <p>{t('items_count', { count: itemCount })}</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => setItemCount((c) => Math.max(0, c - 1))}>
            {t('buttons.cancel')} (–)
          </button>
          <button onClick={() => setItemCount((c) => c + 1)}>
            {t('buttons.save')} (+)
          </button>
        </div>
      </section>

      {/* Navigation keys */}
      <section>
        <h2>Navigation keys</h2>
        <nav>
          <ul>
            <li>{t('nav.home')}</li>
            <li>{t('nav.about')}</li>
            <li>{t('nav.settings')}</li>
          </ul>
        </nav>
      </section>
    </main>
  );
}
