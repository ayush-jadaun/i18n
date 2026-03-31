/**
 * Utility React components for the i18n SDK.
 *
 * @module components
 */

import React from 'react';
import { useTranslation } from './hooks';

// ---------------------------------------------------------------------------
// Trans
// ---------------------------------------------------------------------------

/** Props for {@link Trans}. */
export interface TransProps {
  /**
   * The translation key to look up.
   * The value may contain `<0>`, `<1>` … placeholders that are replaced by
   * the corresponding element from the `components` map.
   */
  i18nKey: string;
  /**
   * A map of named React elements used to replace `<bold>…</bold>`-style
   * tags inside the translated string.
   *
   * @example
   * ```tsx
   * // translation: "Click <link>here</link> to continue"
   * <Trans i18nKey="cta.text" components={{ link: <a href="/go" /> }} />
   * ```
   */
  components?: Record<string, React.ReactElement>;
  /** Optional interpolation parameters forwarded to the translation engine. */
  params?: Record<string, string | number>;
  /** Optional namespace passed to `useTranslation`. */
  namespace?: string;
}

/**
 * Renders a translated string, optionally embedding React elements at
 * named tag positions.
 *
 * The component calls `useTranslation(props.namespace)` internally, so it must
 * be rendered inside an {@link I18nProvider}.
 *
 * Tag replacement syntax: `<tagName>content</tagName>` — the content between
 * the tags becomes the children of the matching component from `components`.
 *
 * @example
 * ```tsx
 * // en.json: { "tos": "I agree to the <bold>Terms of Service</bold>" }
 * <Trans i18nKey="tos" components={{ bold: <strong /> }} />
 * // Renders: I agree to the <strong>Terms of Service</strong>
 * ```
 */
export function Trans({
  i18nKey,
  components = {},
  params,
  namespace,
}: TransProps): React.ReactElement {
  const { t } = useTranslation(namespace);
  const translated = t(i18nKey, params);

  if (Object.keys(components).length === 0) {
    return <>{translated}</>;
  }

  // Parse the translated string and replace <tagName>…</tagName> patterns.
  const parts = parseTaggedString(translated, components);
  return <>{parts}</>;
}

/**
 * Splits a string containing `<tag>content</tag>` markers into an array of
 * strings and React elements.
 *
 * @param text - The translated string to parse
 * @param components - Map of tag name → React element to clone
 * @returns An array of strings and React elements suitable for rendering
 * @internal
 */
function parseTaggedString(
  text: string,
  components: Record<string, React.ReactElement>,
): React.ReactNode[] {
  const tagPattern = /<(\w+)>(.*?)<\/\1>/gs;
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(text)) !== null) {
    const [fullMatch, tagName, inner] = match;
    const matchStart = match.index;

    // Text before the tag
    if (matchStart > lastIndex) {
      result.push(text.slice(lastIndex, matchStart));
    }

    const component = tagName !== undefined ? components[tagName] : undefined;
    if (component !== undefined) {
      result.push(
        React.cloneElement(component, { key: `${tagName}-${matchStart}` }, inner),
      );
    } else {
      // Unknown tag — emit as plain text
      result.push(fullMatch);
    }

    lastIndex = matchStart + (fullMatch?.length ?? 0);
  }

  // Remaining text after the last tag
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

// ---------------------------------------------------------------------------
// LocaleSwitcher
// ---------------------------------------------------------------------------

/** Props for {@link LocaleSwitcher}. */
export interface LocaleSwitcherProps {
  /** The list of locale codes to render as options. */
  locales: string[];
  /**
   * Called when the user selects a new locale.  When omitted, `setLocale`
   * from {@link useTranslation} is invoked automatically.
   */
  onChange?: (locale: string) => void;
  /** Additional CSS class name applied to the `<select>` element. */
  className?: string;
}

/**
 * A simple `<select>` dropdown that lets users switch the active locale.
 *
 * Must be rendered inside an {@link I18nProvider}.
 *
 * @example
 * ```tsx
 * <LocaleSwitcher locales={['en', 'fr', 'de']} />
 * ```
 */
export function LocaleSwitcher({
  locales,
  onChange,
  className,
}: LocaleSwitcherProps): React.ReactElement {
  const { locale, setLocale } = useTranslation();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value;
    if (onChange) {
      onChange(next);
    } else {
      void setLocale(next);
    }
  }

  return (
    <select
      value={locale}
      onChange={handleChange}
      className={className}
      aria-label="Select language"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {loc}
        </option>
      ))}
    </select>
  );
}
