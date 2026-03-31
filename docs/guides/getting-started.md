# Getting Started with i18n-platform

This guide takes you from zero to a running local environment in under 10 minutes, then walks through creating your first project and integrating the SDK into an app.

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20.x | Required by all packages |
| pnpm | 9.x | `npm install -g pnpm` |
| Docker | 24.x | Runs Postgres, Redis, MinIO, Mailpit |
| Docker Compose | v2 | Bundled with Docker Desktop |

---

## 1. Clone and Install

```bash
git clone https://github.com/your-org/i18n-platform.git
cd i18n-platform
pnpm install
```

pnpm resolves the workspace and links all internal packages (`@i18n-platform/core`, `@i18n-platform/database`, etc.) via `pnpm-workspace.yaml`.

---

## 2. Start Docker Services

```bash
docker compose up -d
```

This starts four services defined in `docker-compose.yml`:

| Service | Port | Purpose |
|---|---|---|
| `postgres` | `5432` | Primary database (PostgreSQL 16) |
| `redis` | `6379` | Cache and rate-limit state |
| `minio` | `9000` / `9001` | S3-compatible object storage (API / console) |
| `mailpit` | `8025` / `1025` | Email capture (web UI / SMTP) |

Data is persisted under `.docker-data/` in the project root (gitignored).

Verify services are healthy:

```bash
docker compose ps
```

All services should show `healthy` in the STATUS column.

---

## 3. Configure Environment Variables

Copy the example environment file for the API:

```bash
cp packages/api/.env.example packages/api/.env
```

The defaults in `.env.example` match the Docker Compose service settings:

```dotenv
DATABASE_URL=postgresql://i18n:i18n@localhost:5432/i18n_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production-minimum-16-chars
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
CORS_ORIGINS=http://localhost:3001
API_PORT=3000
LOG_LEVEL=info
```

For MinIO (CDN publisher), also set:

```dotenv
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=i18n-translations
S3_REGION=us-east-1
```

---

## 4. Run Database Migrations and Seed

Generate and apply Drizzle migrations:

```bash
pnpm db:generate   # Generate migration files from schema
pnpm db:migrate    # Apply pending migrations to Postgres
```

Seed the database with a demo organization, project, and sample translation keys:

```bash
pnpm db:seed
```

The seeder (at `packages/database/src/seed.ts`) creates:
- Organization: **Demo Org** (slug: `demo-org`)
- Project: **Demo App** (default locale: `en`, supported: `en`, `fr`, `de`, `es`)
- Namespaces: `common`, `auth`, `errors`
- Sample translation keys across all namespaces

---

## 5. Start the API and Dashboard

Open two terminal windows:

```bash
# Terminal 1 — API server
pnpm --filter @i18n-platform/api dev
# Starts Fastify on http://localhost:3000
```

```bash
# Terminal 2 — Dashboard (Next.js)
pnpm --filter @i18n-platform/dashboard dev
# Starts Next.js on http://localhost:3001
```

Confirm the API is running:

```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}
```

Open the dashboard at `http://localhost:3001`. You can register a new account at `/register` or log in with the seeded credentials.

---

## 6. Create Your First Project via CLI

Install the CLI globally or use it via pnpm:

```bash
# Option A: use from workspace
pnpm --filter @i18n-platform/cli exec i18n --help

# Option B: install globally after building
pnpm --filter @i18n-platform/cli build
npm install -g ./packages/cli
```

### 6.1 Register and get an API key

```bash
# Register an account (or use existing credentials)
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","name":"Dev User","password":"securepassword"}'
```

Copy the `accessToken` from the response. Use it to create an organization, project, and API key through the dashboard, or via the REST API directly.

### 6.2 Initialize CLI config

Navigate to your application directory and run:

```bash
cd /path/to/your-app
i18n init
```

This creates `i18n.config.ts`:

```typescript
const config: ProjectConfig = {
  projectId: 'YOUR_PROJECT_UUID',   // from dashboard
  apiUrl: 'http://localhost:3000',
  apiKey: process.env['I18N_API_KEY'] ?? '',
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr', 'de', 'es'],
  namespaces: [],
  delivery: { mode: 'bundled' },
  source: {
    include: ['src/**/*.{ts,tsx,js,jsx}'],
    exclude: ['src/**/*.test.{ts,tsx}'],
    defaultNamespace: 'common',
  },
  output: {
    path: 'public/locales',
    filePattern: '{{locale}}/{{namespace}}.json',
    sortKeys: true,
  },
};
```

Set the `projectId` and `apiKey` from the dashboard.

### 6.3 Extract and push translation keys

```bash
export I18N_API_KEY=i18n_your_api_key_here

# Preview what would be pushed (dry run)
i18n push --dry-run

# Push keys to the platform
i18n push
```

### 6.4 Pull translations

After a translator has added translations through the dashboard:

```bash
i18n pull
# Writes: public/locales/en/common.json
#         public/locales/fr/common.json
#         ...
```

---

## 7. Add the SDK to Your App

### React

```bash
cd /path/to/your-app
pnpm add @i18n-platform/sdk-react
```

Wrap your app in `<I18nProvider>`:

```tsx
// src/main.tsx
import { createI18n } from '@i18n-platform/sdk-js';
import { I18nProvider } from '@i18n-platform/sdk-react';
import en from '../public/locales/en/common.json';
import fr from '../public/locales/fr/common.json';

const i18n = createI18n({
  projectId: 'your-project-id',
  defaultLocale: 'en',
  supportedLocales: ['en', 'fr'],
  delivery: 'bundled',
  translations: { en, fr },
});

export function App() {
  return (
    <I18nProvider i18n={i18n}>
      <YourApp />
    </I18nProvider>
  );
}
```

Use the `useTranslation` hook in any component:

```tsx
import { useTranslation } from '@i18n-platform/sdk-react';

function Greeting() {
  const { t, locale, setLocale } = useTranslation('common');

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => setLocale('fr')}>Français</button>
    </div>
  );
}
```

### Vanilla JavaScript

```bash
pnpm add @i18n-platform/sdk-js
```

```javascript
import { createI18n } from '@i18n-platform/sdk-js';

const i18n = createI18n({
  projectId: 'your-project-id',
  defaultLocale: 'en',
  delivery: 'cdn',
  cdnUrl: 'https://cdn.example.com',
});

await i18n.setLocale('en');
console.log(i18n.t('common.welcome')); // "Welcome"
```

---

## Next Steps

- Read the [CLI Reference](./cli.md) for all 10 commands.
- Read the [Deployment Guide](./deployment.md) to move to production.
- Review the [HLD](../HLD.md) for the system architecture overview.
- Review the [LLD](../LLD.md) for the full API contract and database schema.
