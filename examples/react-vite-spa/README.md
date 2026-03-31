# React Vite SPA — i18n Platform Example

A minimal **Vite + React** single-page application demonstrating how to
integrate `@i18n-platform/sdk-react`.

## Features

- Bundled translations for `en` and `fr`
- Greeting with interpolation
- Plural-aware item counter
- Built-in `<LocaleSwitcher>` component

## Getting started

```bash
# From this directory
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project structure

```
src/
  main.tsx          — App entry point
  App.tsx           — I18nProvider + Content component
  i18n/
    config.ts       — I18nConfig with bundled translations
    en.json         — English translations
    fr.json         — French translations
```

## Key patterns

### Wrap your app with `<I18nProvider>`

```tsx
import { I18nProvider } from '@i18n-platform/sdk-react';
import { i18nConfig } from './i18n/config';

export default function App() {
  return (
    <I18nProvider config={i18nConfig}>
      <YourContent />
    </I18nProvider>
  );
}
```

### Use `useTranslation()` in any child component

```tsx
import { useTranslation } from '@i18n-platform/sdk-react';

function Greeting() {
  const { t, setLocale } = useTranslation();
  return (
    <>
      <p>{t('greeting', { name: 'Alice' })}</p>
      <button onClick={() => setLocale('fr')}>Français</button>
    </>
  );
}
```
