# Next.js App Router — i18n Platform Example

A minimal **Next.js 15 App Router** project demonstrating how to integrate
`@i18n-platform/sdk-react` for client-side internationalization.

## Features

- Bundled translations for `en`, `fr`, and `de`
- Greeting with `{name}` interpolation
- Plural-aware item count (`items_count`)
- Live locale switcher using the built-in `<LocaleSwitcher>` component

## Getting started

```bash
# From this directory
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How it works

| File | Purpose |
|---|---|
| `src/i18n/config.ts` | Defines `I18nConfig` with bundled translations |
| `src/i18n/translations/*.json` | Translation files for each locale |
| `src/app/layout.tsx` | Wraps the page tree with `<I18nProvider>` |
| `src/app/page.tsx` | Uses `useTranslation()` and `<LocaleSwitcher>` |

## Switching to API/CDN delivery

Replace the `delivery` field in `src/i18n/config.ts`:

```ts
// CDN delivery
export const i18nConfig: I18nConfig = {
  projectId: 'my-project',
  defaultLocale: 'en',
  delivery: 'cdn',
  cdnUrl: 'https://cdn.i18n-platform.com',
};

// Live API delivery
export const i18nConfig: I18nConfig = {
  projectId: 'my-project',
  defaultLocale: 'en',
  delivery: 'api',
  apiUrl: 'https://api.i18n-platform.com',
  apiKey: process.env.NEXT_PUBLIC_I18N_API_KEY,
};
```
