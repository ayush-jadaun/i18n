# CLI Reference — i18n-platform

The `@i18n-platform/cli` package provides the `i18n` command-line tool for developers. It reads configuration from `i18n.config.ts` in the working directory and communicates with the platform API via a typed HTTP client.

## Installation

```bash
# Use from the monorepo workspace
pnpm --filter @i18n-platform/cli exec i18n <command>

# Or install globally after building
pnpm --filter @i18n-platform/cli build
npm install -g ./packages/cli
```

## Global Options

All commands accept:

| Flag | Description |
|---|---|
| `-c, --config <path>` | Explicit path to `i18n.config.ts` (default: auto-discovered) |
| `-h, --help` | Show command help |
| `-V, --version` | Print CLI version |

## Configuration File

Running `i18n init` generates `i18n.config.ts` at the project root. All commands load this file at startup via `loadProjectConfig()` (`packages/cli/src/config.ts`).

Key configuration fields:

```typescript
interface ProjectConfig {
  projectId: string;           // UUID from dashboard
  apiUrl: string;              // e.g. "https://api.example.com"
  apiKey: string;              // i18n_... key, prefer env var
  defaultLocale: string;       // BCP-47 source locale
  supportedLocales: string[];  // All target locales
  namespaces?: string[];       // Namespaces to include ([] = all)
  delivery: { mode: 'api' | 'cdn' | 'bundled' };
  source: {
    include: string[];         // Glob patterns for source files
    exclude?: string[];        // Glob patterns to exclude
    defaultNamespace?: string; // Namespace for unscoped keys
  };
  output: {
    path: string;              // Output directory
    filePattern: string;       // e.g. "{{locale}}/{{namespace}}.json"
    sortKeys?: boolean;
  };
  validation?: {
    checkMissingPlaceholders?: boolean;
    checkExtraPlaceholders?: boolean;
    checkLength?: boolean;
    maxLengthMultiplier?: number;  // e.g. 2.5 = max 2.5x source length
  };
}
```

---

## Commands

### `i18n init`

Scaffold an `i18n.config.ts` in the current directory.

```bash
i18n init [--force]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `-f, --force` | `false` | Overwrite existing config file |

**Behavior:**

- Writes a commented template config to `./i18n.config.ts`.
- Refuses to overwrite an existing file unless `--force` is passed.
- Prints next steps after creation.

**Example:**

```bash
i18n init
# Created i18n.config.ts
# Next steps:
#   1. Set your projectId and apiUrl in i18n.config.ts
#   2. Export I18N_API_KEY in your shell (or .env)
#   3. Run `i18n extract` to discover translation keys

i18n init --force   # overwrite existing config
```

---

### `i18n extract`

Scan source files and print discovered translation keys without contacting the API.

```bash
i18n extract [--config <path>] [--json]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--json` | `false` | Output results as JSON instead of a formatted table |

**Behavior:**

- Resolves files matching `config.source.include`, excluding `config.source.exclude`.
- Runs `ReactExtractor` on `.tsx`/`.jsx` files and `VanillaJsExtractor` on `.ts`/`.js` files in parallel.
- Groups results by namespace and prints a summary.
- Prints warnings for ambiguous or malformed key usages.

**Example:**

```bash
i18n extract
# Extracted 42 key(s) from 18 file(s)
#
#   common (28):
#     common.button.save = "Save"  src/components/Form.tsx:14
#     common.button.cancel        src/components/Form.tsx:15
#     ...
#
#   auth (14):
#     auth.login.title = "Sign in"  src/pages/Login.tsx:8
#     ...

i18n extract --json > keys.json
```

---

### `i18n push`

Extract translation keys from source files and push them to the platform. Duplicate keys are silently skipped (upsert behavior).

```bash
i18n push [--config <path>] [--dry-run]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--dry-run` | `false` | Print keys that would be pushed without making any API call |

**Behavior:**

- Runs the same extraction as `extract`.
- POSTs to `POST /api/v1/projects/:projectId/keys` with the discovered keys.
- Reports how many keys were created vs. skipped (already existed).

**Example:**

```bash
i18n push
# Pushed 42 key(s) to project a1b2c3d4-...

i18n push --dry-run
# Dry run — 42 key(s) would be pushed:
#   [common] common.button.save
#   [auth] auth.login.title
#   ...
```

---

### `i18n pull`

Pull approved translations from the platform and write them to disk.

```bash
i18n pull [--config <path>] [--locale <list>] [--format <format>]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--locale <list>` | All `supportedLocales` | Comma-separated locales to pull |
| `--format <format>` | `json-flat` | Output format |

**Supported formats:**

| Value | Extension | Description |
|---|---|---|
| `json-flat` | `.json` | Flat `{ "key.sub": "value" }` map |
| `json-nested` | `.json` | Nested `{ "key": { "sub": "value" } }` structure |
| `yaml` | `.yaml` | YAML key/value format |
| `po` | `.po` | GNU gettext PO format |
| `xliff` | `.xliff` | XLIFF 1.2 format |

**Behavior:**

- Fetches `GET /api/v1/projects/:projectId/translations/:locale` for each locale.
- Writes files to `config.output.path` using `config.output.filePattern` tokens.
- Sorts keys alphabetically when `config.output.sortKeys` is `true`.

**Example:**

```bash
i18n pull
# Pulled translations — 8 file(s) written to public/locales

i18n pull --locale fr,de
# Pulled translations — 4 file(s) written to public/locales

i18n pull --format yaml
# Writes public/locales/en/common.yaml, fr/common.yaml, ...
```

---

### `i18n sync`

Combines `push` and `pull` in a single command. Pushes extracted keys first, then pulls all translations.

```bash
i18n sync [--config <path>] [--format <format>]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--format <format>` | `json-flat` | Output format for pulled files (same options as `pull`) |

**Behavior:**

- Step 1: Extract keys from source files and POST to `/api/v1/projects/:projectId/keys`.
- Step 2: Pull translations for all `config.supportedLocales` and write to disk.
- Useful for pre-build scripts: `"build": "i18n sync && vite build"`.

**Example:**

```bash
i18n sync
# Step 1/2 — Extracting and pushing keys… Pushed 42 key(s)
# Step 2/2 — Pulling translations… Pulled translations — 8 file(s) written to public/locales
# Sync complete
```

---

### `i18n validate`

Check translation completeness, placeholder integrity, and string length constraints.

```bash
i18n validate [--config <path>] [--locale <list>] [--min-coverage <n>]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--locale <list>` | All non-source locales | Comma-separated locales to validate |
| `--min-coverage <n>` | From config, or 80 | Required minimum coverage % (0–100) |

**Checks performed:**

1. **Coverage** — `coveragePercent >= minCoverage` for each locale.
2. **Missing placeholders** — When `config.validation.checkMissingPlaceholders` is true, verifies every `{{token}}` from the source string appears in the translation.
3. **Extra placeholders** — When `config.validation.checkExtraPlaceholders` is true, flags tokens in the translation that are not in the source.
4. **Length** — When `config.validation.checkLength` is true, warns when `translationLength > sourceLength * maxLengthMultiplier`.

**Exit codes:**

- `0` — all checks passed
- `1` — one or more checks failed

**Example:**

```bash
i18n validate
# fr: coverage 95.2% ✓
# de: coverage 72.0% — BELOW THRESHOLD
# Validation failed — see issues above.

i18n validate --min-coverage 70 --locale fr,de
# fr: coverage 95.2% ✓
# de: coverage 72.0% ✓
# All validation checks passed.
```

---

### `i18n codegen`

Generate TypeScript union types from translation keys for compile-time key safety.

```bash
i18n codegen [--config <path>] [--out <path>]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--out <path>` | `src/i18n.generated.ts` | Output file path |

**Generated output includes:**

- Per-namespace key union types (e.g., `CommonKeys`, `AuthKeys`)
- `AllTranslationKeys` — master union of all keys
- `Namespaces` — union of all namespace names
- `Locales` — union derived from `config.supportedLocales`

**Example:**

```bash
i18n codegen
# Generated TypeScript types → src/i18n.generated.ts
```

Generated file excerpt:

```typescript
// Auto-generated by `i18n codegen`. Do not edit manually.

/** Translation keys in the "common" namespace. */
export type CommonKeys =
  | 'common.button.save'
  | 'common.button.cancel'
  | 'common.nav.home';

/** Translation keys in the "auth" namespace. */
export type AuthKeys =
  | 'auth.login.title'
  | 'auth.login.emailLabel';

export type AllTranslationKeys = CommonKeys | AuthKeys;
export type Namespaces = 'common' | 'auth';
export type Locales = 'en' | 'fr' | 'de' | 'es';
```

Use in your app for type-safe key lookups:

```typescript
import type { AllTranslationKeys } from './i18n.generated';

function translate(key: AllTranslationKeys): string {
  return i18n.t(key);
}
```

---

### `i18n status`

Display translation coverage across all locales with an ASCII progress bar.

```bash
i18n status [--config <path>] [--json]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--json` | `false` | Output raw JSON instead of formatted table |

**Example output:**

```bash
i18n status

Project: a1b2c3d4-e5f6-...
Default locale: en

Locale         Total  Translated    Approved  Coverage
──────────────────────────────────────────────────────────
en               248         248         248  [████████████████████] 100.0%
fr               248         236         220  [█████████████████░░░]  88.7%
de               248         189         175  [███████████████░░░░░]  70.6%
es               248         142         130  [███████████░░░░░░░░░]  52.4%
```

---

### `i18n diff`

Show the difference between keys extracted from local source files and keys registered on the platform.

```bash
i18n diff [--config <path>] [--json]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--json` | `false` | Output `{ added, removed }` as JSON |

**Example output:**

```bash
i18n diff

+ 3 key(s) to be added (run `i18n push`):
  + common:common.button.reset
  + common:common.tooltip.copy
  + auth:auth.twoFactor.title

- 1 key(s) on remote not found locally:
  - common:common.legacy.oldKey
```

Use before pushing to preview what will change, or in code review to understand key drift.

---

### `i18n ci`

CI mode: exit non-zero if translation coverage falls below the configured threshold. Designed for GitHub Actions, GitLab CI, and similar pipelines.

```bash
i18n ci [--config <path>] [--min-coverage <n>] [--locale <list>] [--json]
```

**Options:**

| Flag | Default | Description |
|---|---|---|
| `--min-coverage <n>` | 100 (or 80 if not strict) | Required minimum coverage % |
| `--locale <list>` | All non-source locales | Locales to check |
| `--json` | `false` | Output structured JSON for log parsing |

**Exit codes:**

- `0` — all locales meet the threshold
- `1` — one or more locales are below the threshold

**Example — GitHub Actions:**

```yaml
# .github/workflows/i18n.yml
- name: Check translation coverage
  run: i18n ci --min-coverage 90
  env:
    I18N_API_KEY: ${{ secrets.I18N_API_KEY }}
```

**Example output:**

```bash
i18n ci --min-coverage 80

CI coverage check (threshold: 80%) for project a1b2c3d4-...

fr          95.2% (236/248)
de          72.0% (178/248) — BELOW THRESHOLD
es          52.4% (130/248) — BELOW THRESHOLD

CI check FAILED — 2 locale(s) below 80% coverage.
```

**JSON output** (useful for parsing in CI scripts):

```bash
i18n ci --json
```

```json
{
  "threshold": 80,
  "locales": [
    { "locale": "fr", "coveragePercent": 95.2, "total": 248, "passed": true },
    { "locale": "de", "coveragePercent": 72.0, "total": 248, "passed": false }
  ],
  "passed": false
}
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `I18N_API_KEY` | API key for CLI authentication (recommended over hardcoding in config) |
| `I18N_API_URL` | Override the API URL from config |

Set these in your shell profile or `.env` file (load with `direnv` or `dotenv-cli`):

```bash
export I18N_API_KEY=i18n_abc12345def67890...
```
