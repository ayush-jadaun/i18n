# Express Server — i18n Platform Example

An **Express.js** server demonstrating server-side internationalization using
`@i18n-platform/sdk-node`.

## Features

- Bundled translations for `en`, `fr`, and `de`
- All locales pre-loaded at startup (warm cache for every locale)
- Automatic locale detection from `Accept-Language` headers
- `req.t()` helper available in every route handler
- Type-safe via Express module augmentation

## Getting started

```bash
# From this directory
pnpm install
pnpm dev
```

The server starts on **http://localhost:3001**.

## Testing with curl

### Default locale (English)

```bash
curl http://localhost:3001/
# {"locale":"en","message":"Welcome to the i18n Platform","description":"..."}
```

### French via Accept-Language

```bash
curl -H "Accept-Language: fr" http://localhost:3001/
# {"locale":"fr","message":"Bienvenue sur la plateforme i18n",...}
```

### Personalised greeting in German

```bash
curl -H "Accept-Language: de" http://localhost:3001/greet/Alice
# {"locale":"de","greeting":"Hallo, Alice!"}
```

### Pluralization

```bash
curl "http://localhost:3001/items?count=1"
# {"locale":"en","message":"You have 1 item"}

curl "http://localhost:3001/items?count=5"
# {"locale":"en","message":"You have 5 items"}

curl -H "Accept-Language: fr" "http://localhost:3001/items?count=2"
# {"locale":"fr","message":"Vous avez 2 articles"}
```

### Navigation labels

```bash
curl -H "Accept-Language: fr" http://localhost:3001/nav
# {"locale":"fr","nav":{"home":"Accueil","about":"À propos","settings":"Paramètres"}}
```

### Supported locales

```bash
curl http://localhost:3001/locales
# {"supportedLocales":["en","fr","de"]}
```

## How it works

1. `createI18nServer()` pre-loads all locales and returns an `I18nServerInstance`.
2. `i18nMiddleware(i18n)` reads the `Accept-Language` header, calls
   `detectLocale()`, and attaches `req.t` and `req.locale` to every request.
3. Route handlers call `req.t('key', params)` — no shared mutable state is
   touched, making it safe for concurrent requests.
