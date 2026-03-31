/**
 * Tests for Trans component and LocaleSwitcher.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from './provider';
import { Trans, LocaleSwitcher } from './components';
import type { I18nConfig } from '@i18n-platform/sdk-js';

const config: I18nConfig = {
  projectId: 'test',
  defaultLocale: 'en',
  delivery: 'bundled',
  translations: {
    en: {
      'plain': 'Plain text',
      'bold.text': 'Click <bold>here</bold> to continue',
      'multi.tag': '<em>Italic</em> and <strong>bold</strong>',
      'with.params': 'Hello, {name}!',
    },
    fr: {
      'plain': 'Texte simple',
    },
  },
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider config={config}>{children}</I18nProvider>;
}

/**
 * Renders and flushes all pending async work so that translations are loaded
 * before assertions run.
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

// ── Trans ──────────────────────────────────────────────────────────────────

describe('Trans', () => {
  it('renders plain translated text', async () => {
    await renderFlushed(<Trans i18nKey="plain" />, { wrapper });
    expect(screen.getByText('Plain text')).toBeDefined();
  });

  it('replaces a named tag with the supplied component', async () => {
    await renderFlushed(
      <Trans i18nKey="bold.text" components={{ bold: <strong data-testid="bold-el" /> }} />,
      { wrapper },
    );
    const el = screen.getByTestId('bold-el');
    expect(el.tagName).toBe('STRONG');
    expect(el.textContent).toBe('here');
  });

  it('renders text before and after the tag', async () => {
    const { container } = await renderFlushed(
      <Trans i18nKey="bold.text" components={{ bold: <strong /> }} />,
      { wrapper },
    );
    expect(container.textContent).toBe('Click here to continue');
  });

  it('handles unknown tags by emitting them as plain text', async () => {
    const { container } = await renderFlushed(
      <Trans i18nKey="bold.text" components={{}} />,
      { wrapper },
    );
    expect(container.textContent).toContain('here');
  });

  it('forwards params to the translation engine', async () => {
    await renderFlushed(<Trans i18nKey="with.params" params={{ name: 'Bob' }} />, { wrapper });
    expect(screen.getByText('Hello, Bob!')).toBeDefined();
  });

  it('respects the namespace prop', async () => {
    const nsConfig: I18nConfig = {
      projectId: 'test',
      defaultLocale: 'en',
      delivery: 'bundled',
      translations: { en: { 'ui.title': 'UI Title' } },
    };

    await renderFlushed(
      <I18nProvider config={nsConfig}>
        <Trans i18nKey="title" namespace="ui" />
      </I18nProvider>,
    );
    expect(screen.getByText('UI Title')).toBeDefined();
  });
});

// ── LocaleSwitcher ─────────────────────────────────────────────────────────

describe('LocaleSwitcher', () => {
  it('renders a select element with the provided locales', async () => {
    await renderFlushed(<LocaleSwitcher locales={['en', 'fr', 'de']} />, { wrapper });
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select).toBeDefined();
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(['en', 'fr', 'de']);
  });

  it('has the active locale pre-selected', async () => {
    await renderFlushed(<LocaleSwitcher locales={['en', 'fr']} />, { wrapper });
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('en');
  });

  it('calls onChange when provided instead of setLocale', async () => {
    const onChange = vi.fn();
    await renderFlushed(
      <LocaleSwitcher locales={['en', 'fr']} onChange={onChange} />,
      { wrapper },
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fr' } });
    expect(onChange).toHaveBeenCalledWith('fr');
  });

  it('switches locale automatically when onChange is not provided', async () => {
    await renderFlushed(<LocaleSwitcher locales={['en', 'fr']} />, { wrapper });
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('en');

    await act(async () => {
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fr' } });
    });
    for (let i = 0; i < 5; i++) {
      await act(async () => {});
    }

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('fr');
  });
});
