/**
 * Tests for I18nProvider.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { I18nProvider } from './provider';
import { useTranslation } from './hooks';
import type { I18nConfig } from '@i18n-platform/sdk-js';

const bundledConfig: I18nConfig = {
  projectId: 'test',
  defaultLocale: 'en',
  delivery: 'bundled',
  translations: {
    en: { 'hello': 'Hello', 'greeting': 'Hello, {name}!' },
    fr: { 'hello': 'Bonjour', 'greeting': 'Bonjour, {name}!' },
  },
};

function TestConsumer({ ns }: { ns?: string }) {
  const { t, locale } = useTranslation(ns);
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translation">{t('hello')}</span>
    </div>
  );
}

/**
 * Renders the element and flushes all pending async work.
 *
 * The i18n setLocale() call inside I18nProvider's useEffect traverses several
 * async layers (BundledProvider.load → loadLocale → fetchLocale → setLocale).
 * Each chained async hop requires one `act(async () => {})` round to drain.
 * We run 5 rounds which is sufficient for the deepest chain in sdk-js.
 */
async function renderFlushed(ui: React.ReactElement): Promise<void> {
  await act(async () => { render(ui); });
  for (let i = 0; i < 5; i++) {
    await act(async () => {});
  }
}

describe('I18nProvider', () => {
  it('renders children without crashing', async () => {
    await renderFlushed(
      <I18nProvider config={bundledConfig}>
        <div data-testid="child">child</div>
      </I18nProvider>,
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('provides the default locale to consumers', async () => {
    await renderFlushed(
      <I18nProvider config={bundledConfig}>
        <TestConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('provides a working t() function', async () => {
    await renderFlushed(
      <I18nProvider config={bundledConfig}>
        <TestConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('translation').textContent).toBe('Hello');
  });

  it('sets the initialLocale when provided', async () => {
    await renderFlushed(
      <I18nProvider config={bundledConfig} initialLocale="fr">
        <TestConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('fr');
    expect(screen.getByTestId('translation').textContent).toBe('Bonjour');
  });

  it('defaults to config.defaultLocale when initialLocale is omitted', async () => {
    await renderFlushed(
      <I18nProvider config={bundledConfig}>
        <TestConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('scopes translation keys with a namespace', async () => {
    const cfg: I18nConfig = {
      projectId: 'test',
      defaultLocale: 'en',
      delivery: 'bundled',
      translations: {
        en: { 'auth.hello': 'Auth Hello' },
      },
    };

    await renderFlushed(
      <I18nProvider config={cfg}>
        <TestConsumer ns="auth" />
      </I18nProvider>,
    );
    expect(screen.getByTestId('translation').textContent).toBe('Auth Hello');
  });
});
