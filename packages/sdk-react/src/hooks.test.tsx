/**
 * Tests for useTranslation hook.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from './provider';
import { useTranslation } from './hooks';
import type { I18nConfig } from '@i18n-platform/sdk-js';

const config: I18nConfig = {
  projectId: 'test',
  defaultLocale: 'en',
  delivery: 'bundled',
  translations: {
    en: {
      'greeting': 'Hello, {name}!',
      'items': '{count, plural, one {# item} other {# items}}',
      'simple': 'Simple text',
    },
    fr: {
      'greeting': 'Bonjour, {name}!',
      'simple': 'Texte simple',
    },
  },
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider config={config}>{children}</I18nProvider>;
}

/**
 * Renders and flushes all pending async work so that translations are loaded
 * before assertions run.
 *
 * Multiple act() rounds are required because setLocale() inside I18nProvider's
 * useEffect has several chained async hops (BundledProvider → loadLocale →
 * fetchLocale → setLocale).
 */
async function renderFlushed(
  ui: React.ReactElement,
  options?: Parameters<typeof render>[1],
): Promise<ReturnType<typeof render>> {
  let result!: ReturnType<typeof render>;
  await act(async () => { result = render(ui, options); });
  for (let i = 0; i < 5; i++) {
    await act(async () => {});
  }
  return result;
}

function TranslationDisplay({ tKey, params }: { tKey: string; params?: Record<string, string | number> }) {
  const { t } = useTranslation();
  return <span data-testid="result">{t(tKey, params)}</span>;
}

describe('useTranslation', () => {
  it('returns the translated string for a key', async () => {
    await renderFlushed(<TranslationDisplay tKey="simple" />, { wrapper });
    expect(screen.getByTestId('result').textContent).toBe('Simple text');
  });

  it('interpolates parameters into the template', async () => {
    await renderFlushed(<TranslationDisplay tKey="greeting" params={{ name: 'Alice' }} />, { wrapper });
    expect(screen.getByTestId('result').textContent).toBe('Hello, Alice!');
  });

  it('handles plural forms (one)', async () => {
    await renderFlushed(<TranslationDisplay tKey="items" params={{ count: 1 }} />, { wrapper });
    expect(screen.getByTestId('result').textContent).toBe('1 item');
  });

  it('handles plural forms (other)', async () => {
    await renderFlushed(<TranslationDisplay tKey="items" params={{ count: 5 }} />, { wrapper });
    expect(screen.getByTestId('result').textContent).toBe('5 items');
  });

  it('returns the key when translation is missing', async () => {
    await renderFlushed(<TranslationDisplay tKey="missing.key" />, { wrapper });
    expect(screen.getByTestId('result').textContent).toBe('missing.key');
  });

  it('exposes the current locale', async () => {
    function LocaleDisplay() {
      const { locale } = useTranslation();
      return <span data-testid="locale">{locale}</span>;
    }

    await renderFlushed(<LocaleDisplay />, { wrapper });
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('switches locale via setLocale', async () => {
    function LocaleSwitchTest() {
      const { t, locale, setLocale } = useTranslation();
      return (
        <div>
          <span data-testid="locale">{locale}</span>
          <span data-testid="text">{t('simple')}</span>
          <button onClick={() => void setLocale('fr')}>Switch to FR</button>
        </div>
      );
    }

    await renderFlushed(<LocaleSwitchTest />, { wrapper });
    expect(screen.getByTestId('locale').textContent).toBe('en');

    // Fire click + flush the setLocale Promise + forceUpdate
    await act(async () => {
      fireEvent.click(screen.getByText('Switch to FR'));
    });
    for (let i = 0; i < 5; i++) {
      await act(async () => {});
    }

    expect(screen.getByTestId('locale').textContent).toBe('fr');
    expect(screen.getByTestId('text').textContent).toBe('Texte simple');
  });

  it('prefixes keys with namespace when provided', async () => {
    function NamespacedConsumer() {
      const { t } = useTranslation('ns');
      return <span data-testid="result">{t('key')}</span>;
    }

    const nsConfig: I18nConfig = {
      projectId: 'test',
      defaultLocale: 'en',
      delivery: 'bundled',
      translations: { en: { 'ns.key': 'Namespaced value' } },
    };

    await renderFlushed(
      <I18nProvider config={nsConfig}>
        <NamespacedConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('result').textContent).toBe('Namespaced value');
  });

  it('throws when used outside of I18nProvider', () => {
    function Bare() {
      useTranslation();
      return null;
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow(/I18nProvider/);
    consoleSpy.mockRestore();
  });
});
