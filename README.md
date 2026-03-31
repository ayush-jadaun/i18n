# i18n-platform

**Self-hosted i18n automation — an open-source alternative to Crowdin and Lokalise.**

[![Build](https://img.shields.io/github/actions/workflow/status/ayush-jadaun/i18n/ci.yml?branch=main&label=build)](https://github.com/ayush-jadaun/i18n/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Packages](https://img.shields.io/badge/packages-10-blueviolet)](#packages)
[![Tests](https://img.shields.io/badge/tests-680-brightgreen)](#packages)

---

## What is this?

i18n-platform is a production-grade, fully self-hosted internationalization platform you can run on your own infrastructure. It ships a web dashboard for translator collaboration, SDKs for React, Vanilla JS, Node.js, and React Native, a developer CLI for extract/push/pull/validate workflows, and an AI-powered machine translation layer with smart provider routing and quality scoring — all in a single monorepo.

---

## Features

- **Web dashboard** — translator workspace with a rich editor, comment threads, import/export, and project-level statistics
- **SDK suite** — first-class clients for React (hooks + context), Vanilla JS, Node.js, and React Native
- **CLI toolchain** — `extract`, `push`, `pull`, `sync`, `validate`, `codegen` commands for any CI pipeline
- **7 file formats** — JSON, YAML, PO/POT, XLIFF, Android XML, iOS `.strings`, and CSV
- **AI / MT layer** — pluggable provider routing (DeepL, Google, OpenAI, etc.) with per-segment quality scoring and fallback chains
- **Multi-tenant RBAC** — organisations, projects, and fine-grained roles (owner, manager, translator, reviewer)
- **3 delivery modes** — live REST API, edge CDN publishing, and bundled static output
- **Full audit trail** — every translation change is versioned and attributable
- **Docker Compose** — one command to stand up the full stack locally

---

## Architecture

```mermaid
graph TD
    subgraph Clients
        D[Dashboard\nNext.js 15]
        CLI[CLI\n@i18n-platform/cli]
        SDK[SDKs\nReact / JS / Node / RN]
    end

    subgraph API Layer
        A[Fastify API\n@i18n-platform/api]
    end

    subgraph Data
        PG[(PostgreSQL\nDrizzle ORM)]
        RD[(Redis\nqueue + cache)]
        S3[(Object Storage\nS3-compatible)]
    end

    subgraph Translation
        MT[MT Router\nDeepL · Google · OpenAI]
        CDN[CDN Publisher\n@i18n-platform/cdn-publisher]
    end

    D -->|REST / WebSocket| A
    CLI -->|REST| A
    SDK -->|REST / bundle| A

    A --> PG
    A --> RD
    A --> S3
    A --> MT
    A --> CDN
```

---

## Packages

| Package | Description | Tests |
|---|---|---|
| `@i18n-platform/core` | Translation engine, file parsers, format adapters, MT orchestration, RBAC, audit log | 310 |
| `@i18n-platform/database` | Drizzle ORM schema, migrations, and seed scripts | 15 |
| `@i18n-platform/api` | Fastify REST API — projects, translations, users, webhooks, MT endpoints | 149 |
| `@i18n-platform/cli` | Developer CLI — extract, push, pull, sync, validate, codegen | 20 |
| `@i18n-platform/sdk-js` | Universal JavaScript SDK with lazy loading, caching, and CDN support | 63 |
| `@i18n-platform/sdk-react` | React SDK — `I18nProvider`, `useTranslation`, `Trans` component | 25 |
| `@i18n-platform/sdk-node` | Node.js SDK optimised for server-side rendering and API routes | 18 |
| `@i18n-platform/sdk-react-native` | React Native SDK with Expo support and locale detection | 14 |
| `@i18n-platform/cdn-publisher` | Publishes translation bundles to S3-compatible CDN origins | 38 |
| `@i18n-platform/dashboard` | Next.js 15 web dashboard for translators and project managers | 28 |
| **Total** | | **680** |

---

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose

### Run locally

```bash
git clone https://github.com/ayush-jadaun/i18n.git
cd i18n
pnpm install
docker compose up -d
pnpm build
pnpm test
```

The API will be available at `http://localhost:3000` and the dashboard at `http://localhost:3001`.

---

## SDK Usage

### React

```tsx
import { I18nProvider, useTranslation } from '@i18n-platform/sdk-react';

function App() {
  return (
    <I18nProvider projectId="my-project" locale="en">
      <Greeting />
    </I18nProvider>
  );
}

function Greeting() {
  const { t, setLocale } = useTranslation();
  return (
    <>
      <h1>{t('greeting', { name: 'World' })}</h1>
      <button onClick={() => setLocale('fr')}>Français</button>
    </>
  );
}
```

### Node.js

```ts
import { createI18nClient } from '@i18n-platform/sdk-node';

const i18n = createI18nClient({ projectId: 'my-project', locale: 'en' });
await i18n.init();

console.log(i18n.t('welcome_message'));
```

---

## CLI Usage

```bash
# Initialise a project config
i18n init

# Extract translation keys from source files
i18n extract --source ./src

# Push source strings to the platform
i18n push

# Pull translated strings for specific locales
i18n pull --locale fr,de,ja

# Validate translation files for missing keys
i18n validate

# Generate TypeScript types from your keys
i18n codegen --out ./src/i18n/types.ts
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.7 |
| API server | Fastify 5 |
| Dashboard | Next.js 15 (App Router) |
| ORM | Drizzle ORM |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Validation | Zod |
| Monorepo | Turborepo + pnpm workspaces |
| Testing | Vitest |
| Containerisation | Docker Compose |

---

## Documentation

| Document | Description |
|---|---|
| [`docs/HLD.md`](./docs/HLD.md) | High-level system design — components, data flow, deployment |
| [`docs/LLD.md`](./docs/LLD.md) | Low-level design — schema, API contracts, module internals |
| [`docs/guides/getting-started.md`](./docs/guides/getting-started.md) | Step-by-step setup guide |
| [`docs/guides/cli.md`](./docs/guides/cli.md) | Full CLI reference |
| [`docs/guides/deployment.md`](./docs/guides/deployment.md) | Production deployment guide |

---

## Examples

Ready-to-run example projects are in the [`examples/`](./examples) directory:

| Example | Stack |
|---|---|
| [`examples/nextjs-app-router`](./examples/nextjs-app-router) | Next.js 15 App Router |
| [`examples/react-vite-spa`](./examples/react-vite-spa) | React + Vite SPA |
| [`examples/express-server`](./examples/express-server) | Express.js server-side |
| [`examples/vanilla-html`](./examples/vanilla-html) | Plain HTML + JS |
| [`examples/cdn-publisher`](./examples/cdn-publisher) | CDN bundle delivery |

---

## Project Structure

```
i18n/
├── packages/
│   ├── core/               # Translation engine and shared utilities
│   ├── database/           # Schema, migrations, seeds
│   ├── api/                # Fastify REST API
│   ├── cli/                # Developer CLI
│   ├── sdk-js/             # Universal JS SDK
│   ├── sdk-react/          # React SDK
│   ├── sdk-node/           # Node.js SDK
│   ├── sdk-react-native/   # React Native SDK
│   └── cdn-publisher/      # CDN bundle publisher
├── apps/
│   └── dashboard/          # Next.js 15 web dashboard
├── examples/               # Runnable example projects
├── docs/                   # HLD, LLD, and guides
├── k6/                     # K6 performance test scripts
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

---

## License

[MIT](./LICENSE) — Ayush Jadaun
