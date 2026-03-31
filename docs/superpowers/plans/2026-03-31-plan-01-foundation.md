# Plan 1: Foundation — Monorepo, Core Package, Database Schema, Docker

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the monorepo scaffold, core package with all types/interfaces/Zod schemas, database package with full Drizzle schema, and Docker Compose for local development.

**Architecture:** pnpm workspaces + Turborepo monorepo. `@i18n-platform/core` defines all shared types, adapter interfaces, and validation schemas with zero external runtime deps beyond Zod. `@i18n-platform/database` contains the full Drizzle ORM schema for PostgreSQL. Both packages are fully tested and build independently.

**Tech Stack:** TypeScript 5.x (strict), pnpm, Turborepo, Zod, Drizzle ORM, PostgreSQL 16, Redis 7, Vitest, Docker Compose

---

## File Map

```
i18n-platform/
├── package.json                          — Root workspace config
├── pnpm-workspace.yaml                   — Workspace package paths
├── turbo.json                            — Turborepo pipeline config
├── tsconfig.base.json                    — Shared TS compiler options
├── .eslintrc.cjs                         — ESLint config
├── .prettierrc                           — Prettier config
├── .gitignore                            — Git ignores
├── .env.example                          — Documented env vars
├── docker-compose.yml                    — Local dev services
├── CLAUDE.md                             — Project conventions for AI
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsup.config.ts                — Build config
│   │   ├── vitest.config.ts              — Test config
│   │   └── src/
│   │       ├── index.ts                  — Public API barrel export
│   │       ├── types/
│   │       │   ├── index.ts
│   │       │   ├── locale.ts             — Locale, PluralCategory
│   │       │   ├── translation.ts        — TranslationKey, TranslationValue, TranslationMap, TranslationStatus
│   │       │   ├── organization.ts       — Organization, OrgMember, OrgRole
│   │       │   ├── project.ts            — Project, ProjectConfig, Namespace, ProjectLocale
│   │       │   ├── user.ts               — User, UserPreferences
│   │       │   ├── api-key.ts            — ApiKey, ApiKeyScopes
│   │       │   ├── mt.ts                 — MachineTranslationConfig, TranslateParams, TranslateResult, QualityScore
│   │       │   ├── context.ts            — KeyContext, ContextType
│   │       │   ├── audit.ts              — AuditLogEntry
│   │       │   └── delivery.ts           — DeliveryMode, CdnConfig
│   │       ├── interfaces/
│   │       │   ├── index.ts
│   │       │   ├── format-adapter.ts     — IFormatAdapter
│   │       │   ├── translation-provider.ts — ITranslationProvider
│   │       │   ├── machine-translator.ts — IMachineTranslator
│   │       │   ├── storage-adapter.ts    — IStorageAdapter
│   │       │   ├── cache-adapter.ts      — ICacheAdapter
│   │       │   ├── notification-adapter.ts — INotificationAdapter
│   │       │   └── key-extractor.ts      — IKeyExtractor
│   │       ├── schemas/
│   │       │   ├── index.ts
│   │       │   ├── locale.schema.ts
│   │       │   ├── translation.schema.ts
│   │       │   ├── project.schema.ts
│   │       │   ├── organization.schema.ts
│   │       │   ├── user.schema.ts
│   │       │   ├── api-key.schema.ts
│   │       │   ├── mt.schema.ts
│   │       │   └── import-export.schema.ts
│   │       └── errors/
│   │           ├── index.ts
│   │           └── i18n-error.ts         — Base error + typed subclasses
│   └── database/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsup.config.ts
│       ├── vitest.config.ts
│       ├── drizzle.config.ts             — Drizzle Kit config
│       └── src/
│           ├── index.ts                  — Public API barrel export
│           ├── connection.ts             — DB connection factory
│           ├── schema/
│           │   ├── index.ts
│           │   ├── organizations.ts
│           │   ├── users.ts
│           │   ├── org-members.ts
│           │   ├── projects.ts
│           │   ├── project-locales.ts
│           │   ├── namespaces.ts
│           │   ├── translation-keys.ts
│           │   ├── translations.ts
│           │   ├── translation-history.ts
│           │   ├── translation-reviews.ts
│           │   ├── key-contexts.ts
│           │   ├── api-keys.ts
│           │   ├── mt-configs.ts
│           │   ├── mt-quality-scores.ts
│           │   └── audit-log.ts
│           ├── relations.ts              — Drizzle relation definitions
│           └── seed.ts                   — Seed data for dev
```

---

### Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc`
- Create: `.gitignore`
- Create: `.npmrc`

- [ ] **Step 1: Initialize git repo and pnpm workspace**

```bash
cd "E:/Web dev/projects/i18n"
git init
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "i18n-platform",
  "private": true,
  "version": "0.0.0",
  "description": "Self-hosted i18n automation platform — dashboard, SDKs, CLI, and AI-powered translation",
  "packageManager": "pnpm@9.15.4",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "test:watch": "turbo run test:watch",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "typecheck": "turbo run typecheck",
    "clean": "turbo run clean",
    "db:generate": "turbo run db:generate --filter=@i18n-platform/database",
    "db:migrate": "turbo run db:migrate --filter=@i18n-platform/database",
    "db:seed": "turbo run db:seed --filter=@i18n-platform/database"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0",
    "tsup": "^8.3.0",
    "turbo": "^2.3.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

- [ ] **Step 4: Create `.npmrc`**

```ini
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 5: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint:fix": {
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false,
      "outputs": []
    },
    "db:generate": {
      "outputs": ["drizzle/**"]
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

- [ ] **Step 6: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": false
  }
}
```

- [ ] **Step 7: Create `.eslintrc.cjs`**

```javascript
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
  ],
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  ignorePatterns: ["dist/", "node_modules/", "*.js", "*.cjs", "*.mjs"],
};
```

- [ ] **Step 8: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 9: Create `.gitignore`**

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
.turbo/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test
coverage/

# Database
drizzle/meta/

# Docker volumes
.docker-data/
```

- [ ] **Step 10: Install dependencies**

Run: `pnpm install`

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .eslintrc.cjs .prettierrc .gitignore .npmrc
git commit -m "chore: scaffold monorepo with pnpm, turborepo, typescript, eslint, prettier"
```

---

### Task 2: Core Package — Project Setup

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/tsup.config.ts`
- Create: `packages/core/vitest.config.ts`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@i18n-platform/core",
  "version": "0.1.0",
  "description": "Shared types, interfaces, adapters, and validation schemas for i18n-platform",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsup": "^8.3.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/core/tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
});
```

- [ ] **Step 4: Create `packages/core/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

- [ ] **Step 5: Create placeholder `packages/core/src/index.ts`**

```typescript
/**
 * @i18n-platform/core
 *
 * Shared types, interfaces, adapter contracts, and validation schemas
 * for the i18n automation platform.
 *
 * @packageDocumentation
 */

// Types will be exported here as they are created
export {};
```

- [ ] **Step 6: Install core dependencies**

Run: `cd "E:/Web dev/projects/i18n" && pnpm install`

- [ ] **Step 7: Verify build works**

Run: `pnpm --filter @i18n-platform/core build`
Expected: Clean build with `dist/` output

- [ ] **Step 8: Commit**

```bash
git add packages/core/
git commit -m "chore(core): scaffold core package with tsup, vitest, zod"
```

---

### Task 3: Core Package — Locale & Translation Types

**Files:**
- Create: `packages/core/src/types/locale.ts`
- Create: `packages/core/src/types/translation.ts`
- Create: `packages/core/src/types/delivery.ts`
- Create: `packages/core/src/types/index.ts`
- Test: `packages/core/src/types/locale.test.ts`
- Test: `packages/core/src/types/translation.test.ts`

- [ ] **Step 1: Write failing tests for locale types**

Create `packages/core/src/types/locale.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  PLURAL_CATEGORIES,
  isValidLocale,
  parseLocale,
} from './locale';
import type { Locale, PluralCategory, ParsedLocale } from './locale';

describe('Locale types', () => {
  describe('PLURAL_CATEGORIES', () => {
    it('should contain all ICU plural categories', () => {
      expect(PLURAL_CATEGORIES).toEqual(['zero', 'one', 'two', 'few', 'many', 'other']);
    });
  });

  describe('isValidLocale', () => {
    it('should accept valid BCP-47 locales', () => {
      expect(isValidLocale('en')).toBe(true);
      expect(isValidLocale('en-US')).toBe(true);
      expect(isValidLocale('fr-FR')).toBe(true);
      expect(isValidLocale('zh-Hans-CN')).toBe(true);
      expect(isValidLocale('pt-BR')).toBe(true);
    });

    it('should reject invalid locales', () => {
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('x')).toBe(false);
      expect(isValidLocale('english')).toBe(false);
      expect(isValidLocale('en_US')).toBe(false);
      expect(isValidLocale('123')).toBe(false);
    });
  });

  describe('parseLocale', () => {
    it('should parse a simple language code', () => {
      const result = parseLocale('en');
      expect(result).toEqual({ language: 'en', region: undefined, script: undefined });
    });

    it('should parse language with region', () => {
      const result = parseLocale('en-US');
      expect(result).toEqual({ language: 'en', region: 'US', script: undefined });
    });

    it('should parse language with script and region', () => {
      const result = parseLocale('zh-Hans-CN');
      expect(result).toEqual({ language: 'zh', region: 'CN', script: 'Hans' });
    });

    it('should return null for invalid locale', () => {
      expect(parseLocale('invalid')).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @i18n-platform/core test -- src/types/locale.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement locale types**

Create `packages/core/src/types/locale.ts`:

```typescript
/**
 * BCP-47 locale identifier string.
 *
 * @example "en", "en-US", "zh-Hans-CN", "pt-BR"
 */
export type Locale = string;

/**
 * ICU plural categories used for pluralization rules.
 *
 * Different languages use different subsets of these categories.
 * English uses "one" and "other". Arabic uses all six.
 *
 * @see https://unicode-org.github.io/cldr-staging/charts/latest/supplemental/language_plural_rules.html
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/** All ICU plural categories as an ordered array */
export const PLURAL_CATEGORIES: readonly PluralCategory[] = [
  'zero',
  'one',
  'two',
  'few',
  'many',
  'other',
] as const;

/**
 * Parsed components of a BCP-47 locale string.
 */
export interface ParsedLocale {
  /** ISO 639 language code (e.g., "en", "zh") */
  language: string;
  /** ISO 3166-1 alpha-2 region code (e.g., "US", "CN") */
  region: string | undefined;
  /** ISO 15924 script code (e.g., "Hans", "Latn") */
  script: string | undefined;
}

/**
 * BCP-47 locale pattern.
 *
 * Matches: "en", "en-US", "zh-Hans", "zh-Hans-CN"
 * Rejects: "", "x", "english", "en_US", "123"
 */
const BCP47_PATTERN = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2})?$/;

/**
 * Validates whether a string is a valid BCP-47 locale identifier.
 *
 * @param value - The string to validate
 * @returns `true` if the string matches BCP-47 format
 *
 * @example
 * ```ts
 * isValidLocale('en-US'); // true
 * isValidLocale('en_US'); // false
 * ```
 */
export function isValidLocale(value: string): value is Locale {
  return BCP47_PATTERN.test(value);
}

/**
 * Parses a BCP-47 locale string into its components.
 *
 * @param locale - A BCP-47 locale string
 * @returns Parsed locale components, or `null` if invalid
 *
 * @example
 * ```ts
 * parseLocale('zh-Hans-CN');
 * // { language: 'zh', script: 'Hans', region: 'CN' }
 * ```
 */
export function parseLocale(locale: string): ParsedLocale | null {
  if (!isValidLocale(locale)) {
    return null;
  }

  const parts = locale.split('-');
  const language = parts[0]!;
  let script: string | undefined;
  let region: string | undefined;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length === 4) {
      script = part;
    } else if (part.length === 2) {
      region = part;
    }
  }

  return { language, region, script };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @i18n-platform/core test -- src/types/locale.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Write failing tests for translation types**

Create `packages/core/src/types/translation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  TRANSLATION_STATUSES,
  isValidTranslationKey,
} from './translation';
import type {
  TranslationKey,
  TranslationValue,
  TranslationMap,
  TranslationStatus,
  TranslationEntry,
} from './translation';

describe('Translation types', () => {
  describe('TRANSLATION_STATUSES', () => {
    it('should contain all status values in lifecycle order', () => {
      expect(TRANSLATION_STATUSES).toEqual([
        'untranslated',
        'machine_translated',
        'needs_review',
        'reviewed',
        'approved',
        'published',
      ]);
    });
  });

  describe('isValidTranslationKey', () => {
    it('should accept valid dot-separated keys', () => {
      expect(isValidTranslationKey('greeting')).toBe(true);
      expect(isValidTranslationKey('auth.login.title')).toBe(true);
      expect(isValidTranslationKey('common.buttons.submit')).toBe(true);
      expect(isValidTranslationKey('errors.404')).toBe(true);
      expect(isValidTranslationKey('nav.menu_item')).toBe(true);
    });

    it('should reject invalid keys', () => {
      expect(isValidTranslationKey('')).toBe(false);
      expect(isValidTranslationKey('.')).toBe(false);
      expect(isValidTranslationKey('.leading')).toBe(false);
      expect(isValidTranslationKey('trailing.')).toBe(false);
      expect(isValidTranslationKey('double..dot')).toBe(false);
      expect(isValidTranslationKey('has space')).toBe(false);
    });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter @i18n-platform/core test -- src/types/translation.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 7: Implement translation types**

Create `packages/core/src/types/translation.ts`:

```typescript
import type { Locale, PluralCategory } from './locale';

/**
 * A dot-separated translation key.
 *
 * Keys use dots to represent hierarchy: `"auth.login.title"`.
 * Allowed characters: letters, digits, underscores, hyphens, dots.
 *
 * @example "auth.login.title", "common.buttons.submit", "errors.404"
 */
export type TranslationKey = string;

/**
 * A translation value with optional pluralization and metadata.
 */
export interface TranslationValue {
  /** The translated string. Supports ICU MessageFormat interpolation. */
  value: string;
  /** Plural forms for count-based translations (ICU plural categories) */
  pluralForms?: Partial<Record<PluralCategory, string>>;
  /** Disambiguation context (e.g., "button" vs "menu" for the same word) */
  context?: string;
  /** Description for translators explaining where/how this string is used */
  description?: string;
  /** Maximum character length (UI constraint) */
  maxLength?: number;
  /** URLs to screenshots showing this string in context */
  screenshots?: string[];
}

/**
 * A flat map of translation keys to their string values.
 *
 * Used for runtime translation lookups and file serialization.
 */
export type TranslationMap = Record<TranslationKey, string>;

/**
 * A full translation entry including value and all metadata.
 *
 * Used in the API and database — richer than `TranslationMap`.
 */
export interface TranslationEntry {
  /** The translation key */
  key: TranslationKey;
  /** The locale this translation is for */
  locale: Locale;
  /** The translated string value */
  value: string;
  /** Current status in the translation workflow */
  status: TranslationStatus;
  /** Who produced this translation (user ID or MT provider name) */
  translatedBy: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

/**
 * Translation lifecycle status.
 *
 * Flow: untranslated → machine_translated → needs_review → reviewed → approved → published
 */
export type TranslationStatus =
  | 'untranslated'
  | 'machine_translated'
  | 'needs_review'
  | 'reviewed'
  | 'approved'
  | 'published';

/** All translation statuses in lifecycle order */
export const TRANSLATION_STATUSES: readonly TranslationStatus[] = [
  'untranslated',
  'machine_translated',
  'needs_review',
  'reviewed',
  'approved',
  'published',
] as const;

/**
 * Pattern for valid translation keys.
 *
 * Matches: "greeting", "auth.login.title", "errors.404", "nav.menu_item"
 * Rejects: "", ".", ".leading", "trailing.", "double..dot", "has space"
 */
const KEY_PATTERN = /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/;

/**
 * Validates whether a string is a valid translation key.
 *
 * @param value - The string to validate
 * @returns `true` if the string is a valid dot-separated key
 *
 * @example
 * ```ts
 * isValidTranslationKey('auth.login.title'); // true
 * isValidTranslationKey('double..dot');      // false
 * ```
 */
export function isValidTranslationKey(value: string): value is TranslationKey {
  return KEY_PATTERN.test(value);
}
```

- [ ] **Step 8: Implement delivery types**

Create `packages/core/src/types/delivery.ts`:

```typescript
/**
 * How translations are delivered to client applications.
 *
 * - `api` — SDK fetches from platform API at runtime
 * - `cdn` — SDK fetches from CDN (S3/R2 + CloudFront/Cloudflare)
 * - `bundled` — Translations bundled into app at build time
 */
export type DeliveryMode = 'api' | 'cdn' | 'bundled';

/** All valid delivery modes */
export const DELIVERY_MODES: readonly DeliveryMode[] = ['api', 'cdn', 'bundled'] as const;

/**
 * Configuration for CDN-based translation delivery.
 */
export interface CdnConfig {
  /** Base URL for the CDN (e.g., "https://cdn.example.com/i18n") */
  baseUrl: string;
  /** Whether to split bundles by namespace */
  splitByNamespace: boolean;
  /** Cache TTL in seconds for CDN edge caches */
  cacheTtlSeconds: number;
  /** Whether to use versioned URLs (recommended) */
  enableVersioning: boolean;
}
```

- [ ] **Step 9: Run test to verify translation tests pass**

Run: `pnpm --filter @i18n-platform/core test -- src/types/translation.test.ts`
Expected: All tests PASS

- [ ] **Step 10: Create types barrel export**

Create `packages/core/src/types/index.ts`:

```typescript
export type {
  Locale,
  PluralCategory,
  ParsedLocale,
} from './locale';
export { PLURAL_CATEGORIES, isValidLocale, parseLocale } from './locale';

export type {
  TranslationKey,
  TranslationValue,
  TranslationMap,
  TranslationEntry,
  TranslationStatus,
} from './translation';
export { TRANSLATION_STATUSES, isValidTranslationKey } from './translation';

export type { DeliveryMode, CdnConfig } from './delivery';
export { DELIVERY_MODES } from './delivery';
```

- [ ] **Step 11: Commit**

```bash
git add packages/core/src/types/
git commit -m "feat(core): add locale, translation, and delivery types with validation"
```

---

### Task 4: Core Package — Entity Types (Organization, Project, User)

**Files:**
- Create: `packages/core/src/types/organization.ts`
- Create: `packages/core/src/types/project.ts`
- Create: `packages/core/src/types/user.ts`
- Create: `packages/core/src/types/api-key.ts`
- Create: `packages/core/src/types/mt.ts`
- Create: `packages/core/src/types/context.ts`
- Create: `packages/core/src/types/audit.ts`
- Modify: `packages/core/src/types/index.ts`

- [ ] **Step 1: Create organization types**

Create `packages/core/src/types/organization.ts`:

```typescript
/**
 * Roles within an organization.
 *
 * - `owner` — Full control including billing and org deletion
 * - `admin` — Manage members, create projects
 * - `developer` — Push/pull keys, import/export
 * - `translator` — Edit translations for assigned locales
 * - `reviewer` — Approve/reject translations for assigned locales
 */
export type OrgRole = 'owner' | 'admin' | 'developer' | 'translator' | 'reviewer';

/** All organization roles in privilege order (highest to lowest) */
export const ORG_ROLES: readonly OrgRole[] = [
  'owner',
  'admin',
  'developer',
  'translator',
  'reviewer',
] as const;

/**
 * An organization — the top-level tenant boundary.
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: OrganizationSettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Organization-level settings.
 */
export interface OrganizationSettings {
  /** Default machine translation provider for new projects */
  defaultMtProvider?: string;
  /** Default delivery mode for new projects */
  defaultDeliveryMode?: string;
  /** Max projects allowed (undefined = unlimited) */
  maxProjects?: number;
}

/**
 * A member of an organization with their role and granular permissions.
 */
export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  permissions: MemberPermissions;
  joinedAt: string;
}

/**
 * Granular per-project, per-locale permissions for a member.
 */
export interface MemberPermissions {
  /** Per-project permission overrides */
  projects: Record<
    string,
    {
      /** Role override for this specific project */
      role: 'admin' | 'developer' | 'translator' | 'reviewer';
      /** Which locales this member can work with ("*" = all) */
      locales: string[] | '*';
      /** Which namespaces this member can access ("*" = all) */
      namespaces: string[] | '*';
    }
  >;
}
```

- [ ] **Step 2: Create project types**

Create `packages/core/src/types/project.ts`:

```typescript
import type { DeliveryMode } from './delivery';
import type { Locale } from './locale';

/**
 * An i18n project within an organization.
 *
 * Each project has its own locales, namespaces, and translation keys.
 */
export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  defaultLocale: Locale;
  deliveryMode: DeliveryMode;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

/**
 * Project-level settings.
 */
export interface ProjectSettings {
  /** Whether to auto-translate new keys on push */
  autoTranslateOnPush: boolean;
  /** Whether to require review before publishing */
  requireReview: boolean;
  /** Minimum translation coverage to allow publish (0-100) */
  minCoverageForPublish: number;
}

/**
 * A locale enabled for a project with coverage stats.
 */
export interface ProjectLocale {
  id: string;
  projectId: string;
  locale: Locale;
  enabled: boolean;
  coveragePercent: number;
  lastSyncedAt: string | null;
}

/**
 * A namespace for grouping translation keys within a project.
 *
 * @example "common", "auth", "dashboard", "emails"
 */
export interface Namespace {
  id: string;
  projectId: string;
  name: string;
  description: string;
  sortOrder: number;
}

/**
 * CLI/SDK configuration for connecting a project to the platform.
 *
 * Stored in `i18n.config.ts` in the consuming project.
 */
export interface ProjectConfig {
  /** Project ID from the platform */
  projectId: string;
  /** Platform API URL */
  apiUrl: string;
  /** API key (typically from env var) */
  apiKey: string;
  /** Default locale (source language) */
  defaultLocale: Locale;
  /** All locales this project supports */
  supportedLocales: Locale[];
  /** Namespace list */
  namespaces: string[];
  /** How translations are delivered to the app */
  delivery: DeliveryMode;
  /** Source code scanning config */
  source: SourceConfig;
  /** Output file config */
  output: OutputConfig;
  /** Machine translation settings */
  machineTranslation?: MachineTranslationClientConfig;
  /** Validation rules */
  validation: ValidationConfig;
}

/**
 * Source code scanning configuration for key extraction.
 */
export interface SourceConfig {
  /** Directories to scan */
  paths: string[];
  /** Which extractors to use */
  extractors: string[];
  /** Glob patterns to ignore */
  ignore: string[];
}

/**
 * Translation file output configuration.
 */
export interface OutputConfig {
  /** Directory to write translation files */
  path: string;
  /** Output file format */
  format: string;
  /** Whether to create one file per namespace */
  splitByNamespace: boolean;
}

/**
 * Client-side machine translation configuration.
 */
export interface MachineTranslationClientConfig {
  /** Whether MT is enabled for this project */
  enabled: boolean;
  /** Default MT provider */
  provider: string;
  /** Whether to auto-translate on key push */
  autoTranslateOnPush: boolean;
}

/**
 * Validation rules for the CLI `validate` and `ci` commands.
 */
export interface ValidationConfig {
  /** What to do when keys are missing translations */
  missingKeys: 'error' | 'warn' | 'off';
  /** What to do when keys exist in files but not in code */
  unusedKeys: 'error' | 'warn' | 'off';
  /** What to do when interpolation variables don't match across locales */
  interpolationMismatch: 'error' | 'warn' | 'off';
  /** Minimum coverage percentage to pass CI */
  minCoverage: number;
}
```

- [ ] **Step 3: Create user types**

Create `packages/core/src/types/user.ts`:

```typescript
/**
 * A platform user account.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
  createdAt: string;
}

/**
 * User-level preferences.
 */
export interface UserPreferences {
  /** Preferred UI locale for the dashboard */
  dashboardLocale: string;
  /** Preferred theme */
  theme: 'light' | 'dark' | 'system';
  /** Whether to receive email notifications */
  emailNotifications: boolean;
}

/** Default user preferences for new accounts */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  dashboardLocale: 'en',
  theme: 'system',
  emailNotifications: true,
};
```

- [ ] **Step 4: Create API key types**

Create `packages/core/src/types/api-key.ts`:

```typescript
/**
 * Environment scope for an API key.
 */
export type ApiKeyEnvironment = 'development' | 'staging' | 'production';

/** All API key environments */
export const API_KEY_ENVIRONMENTS: readonly ApiKeyEnvironment[] = [
  'development',
  'staging',
  'production',
] as const;

/**
 * A scoped API key for a project.
 */
export interface ApiKey {
  id: string;
  projectId: string;
  name: string;
  /** First 8 characters of the key for identification */
  keyPrefix: string;
  scopes: ApiKeyScopes;
  environment: ApiKeyEnvironment;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

/**
 * Permission scopes for an API key.
 */
export interface ApiKeyScopes {
  /** Translation read/write access */
  translations: 'read' | 'read_write';
  /** Key management access */
  keys: 'read' | 'read_write';
  /** Import/export access */
  importExport: boolean;
  /** Machine translation trigger access */
  mt: boolean;
  /** Publish to CDN access */
  publish: boolean;
}
```

- [ ] **Step 5: Create machine translation types**

Create `packages/core/src/types/mt.ts`:

```typescript
import type { Locale } from './locale';

/**
 * Routing strategy for choosing MT providers.
 *
 * - `user_choice` — Always use the configured provider
 * - `smart` — Pick based on quality scores per locale pair
 * - `fallback_chain` — Try primary, fall back to secondary on failure
 */
export type MtRoutingStrategy = 'user_choice' | 'smart' | 'fallback_chain';

/**
 * Full machine translation configuration for a project.
 */
export interface MachineTranslationConfig {
  /** Global kill switch */
  enabled: boolean;
  /** Fallback provider when routing doesn't apply */
  defaultProvider: string;
  /** Whether to auto-translate when new keys are created */
  autoTranslateOnKeyCreate: boolean;
  /** Routing configuration */
  routing: MtRoutingConfig;
  /** Auto-approve settings */
  autoApprove: MtAutoApproveConfig;
  /** Cost management */
  costLimits: MtCostLimitsConfig;
}

/**
 * MT provider routing rules.
 */
export interface MtRoutingConfig {
  /** Which strategy to use */
  strategy: MtRoutingStrategy;
  /** Per-locale-pair routing rules */
  rules: MtRoutingRule[];
}

/**
 * A routing rule mapping a locale pair to a provider.
 */
export interface MtRoutingRule {
  sourceLocale: Locale;
  targetLocale: Locale;
  provider: string;
  /** Priority for fallback chain (lower = tried first) */
  priority: number;
}

/**
 * Auto-approve config for machine translations.
 */
export interface MtAutoApproveConfig {
  /** Whether auto-approve is enabled */
  enabled: boolean;
  /** Minimum quality score (0-1) to auto-approve */
  qualityThreshold: number;
}

/**
 * Cost limits to prevent runaway MT spend.
 */
export interface MtCostLimitsConfig {
  /** Monthly budget in USD */
  monthlyBudget: number;
  /** Max cost per single request in USD */
  perRequestLimit: number;
  /** Percentage of budget that triggers an alert (0-100) */
  alertThreshold: number;
}

/**
 * Parameters for a single MT translation request.
 */
export interface TranslateParams {
  /** Source language */
  sourceLocale: Locale;
  /** Target language */
  targetLocale: Locale;
  /** Text to translate */
  text: string;
  /** Optional context to improve translation quality */
  context?: string;
  /** Optional glossary terms to respect */
  glossary?: Record<string, string>;
}

/**
 * Result of a single MT translation.
 */
export interface TranslateResult {
  /** Translated text */
  translatedText: string;
  /** Which provider produced this translation */
  provider: string;
  /** Provider-reported confidence (0-1), if available */
  confidence: number | null;
  /** Number of characters/tokens billed */
  usage: { characters: number };
}

/**
 * Parameters for a batch MT request.
 */
export interface TranslateBatchParams {
  sourceLocale: Locale;
  targetLocale: Locale;
  texts: Array<{ key: string; text: string; context?: string }>;
  glossary?: Record<string, string>;
}

/**
 * Result of a batch MT request.
 */
export interface TranslateBatchResult {
  translations: Array<{
    key: string;
    translatedText: string;
    confidence: number | null;
  }>;
  provider: string;
  usage: { characters: number };
}

/**
 * Cost estimate for a translation request.
 */
export interface CostEstimate {
  /** Estimated cost in USD */
  estimatedCostUsd: number;
  /** Provider that would handle the request */
  provider: string;
}

/**
 * Quality score for an MT provider on a specific locale pair.
 *
 * Updated as translators review MT output.
 */
export interface MtQualityScore {
  id: string;
  provider: string;
  /** Locale pair in "source->target" format */
  localePair: string;
  /** Rolling quality score (0-1) */
  qualityScore: number;
  /** Total translations evaluated */
  totalTranslations: number;
  /** Accepted by translator without any edits */
  acceptedWithoutEdit: number;
  /** Accepted with minor edits */
  acceptedWithEdit: number;
  /** Rejected by translator */
  rejected: number;
  /** Start of the scoring window */
  windowStart: string;
  /** End of the scoring window */
  windowEnd: string;
}
```

- [ ] **Step 6: Create context types**

Create `packages/core/src/types/context.ts`:

```typescript
/**
 * Type of context attached to a translation key.
 *
 * - `screenshot` — A screenshot showing where the string appears in the UI
 * - `url` — A URL to the page where the string is used
 */
export type ContextType = 'screenshot' | 'url';

/**
 * Context information attached to a translation key.
 *
 * Helps translators understand where and how a string is used.
 */
export interface KeyContext {
  id: string;
  keyId: string;
  type: ContextType;
  /** URL (for both screenshot storage URL and page URL) */
  value: string;
  /** Optional description explaining the context */
  description: string;
  createdAt: string;
}
```

- [ ] **Step 7: Create audit types**

Create `packages/core/src/types/audit.ts`:

```typescript
/**
 * An entry in the audit log.
 *
 * Records every meaningful action taken in the platform.
 */
export interface AuditLogEntry {
  id: string;
  orgId: string;
  projectId: string | null;
  userId: string;
  /** Action performed (e.g., "translation.updated", "key.created") */
  action: string;
  /** Type of resource affected */
  resourceType: string;
  /** ID of the affected resource */
  resourceId: string;
  /** Previous state (for updates) */
  oldValue: Record<string, unknown> | null;
  /** New state (for creates and updates) */
  newValue: Record<string, unknown> | null;
  /** IP address of the requester */
  ipAddress: string | null;
  createdAt: string;
}

/**
 * Known audit action types.
 */
export const AUDIT_ACTIONS = {
  // Organization
  ORG_CREATED: 'org.created',
  ORG_UPDATED: 'org.updated',
  ORG_DELETED: 'org.deleted',
  MEMBER_INVITED: 'member.invited',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_REMOVED: 'member.removed',

  // Project
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',

  // Keys
  KEY_CREATED: 'key.created',
  KEY_UPDATED: 'key.updated',
  KEY_DELETED: 'key.deleted',
  KEYS_IMPORTED: 'keys.imported',

  // Translations
  TRANSLATION_UPDATED: 'translation.updated',
  TRANSLATION_REVIEWED: 'translation.reviewed',
  TRANSLATION_APPROVED: 'translation.approved',
  TRANSLATION_REJECTED: 'translation.rejected',
  TRANSLATION_PUBLISHED: 'translation.published',
  TRANSLATIONS_IMPORTED: 'translations.imported',

  // MT
  MT_TRANSLATED: 'mt.translated',
  MT_CONFIG_UPDATED: 'mt.config_updated',

  // API Keys
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',
} as const;
```

- [ ] **Step 8: Update types barrel export**

Replace `packages/core/src/types/index.ts` with:

```typescript
export type {
  Locale,
  PluralCategory,
  ParsedLocale,
} from './locale';
export { PLURAL_CATEGORIES, isValidLocale, parseLocale } from './locale';

export type {
  TranslationKey,
  TranslationValue,
  TranslationMap,
  TranslationEntry,
  TranslationStatus,
} from './translation';
export { TRANSLATION_STATUSES, isValidTranslationKey } from './translation';

export type { DeliveryMode, CdnConfig } from './delivery';
export { DELIVERY_MODES } from './delivery';

export type {
  OrgRole,
  Organization,
  OrganizationSettings,
  OrgMember,
  MemberPermissions,
} from './organization';
export { ORG_ROLES } from './organization';

export type {
  Project,
  ProjectSettings,
  ProjectLocale,
  Namespace,
  ProjectConfig,
  SourceConfig,
  OutputConfig,
  MachineTranslationClientConfig,
  ValidationConfig,
} from './project';

export type {
  User,
  UserPreferences,
} from './user';
export { DEFAULT_USER_PREFERENCES } from './user';

export type {
  ApiKeyEnvironment,
  ApiKey,
  ApiKeyScopes,
} from './api-key';
export { API_KEY_ENVIRONMENTS } from './api-key';

export type {
  MtRoutingStrategy,
  MachineTranslationConfig,
  MtRoutingConfig,
  MtRoutingRule,
  MtAutoApproveConfig,
  MtCostLimitsConfig,
  TranslateParams,
  TranslateResult,
  TranslateBatchParams,
  TranslateBatchResult,
  CostEstimate,
  MtQualityScore,
} from './mt';

export type { ContextType, KeyContext } from './context';

export type { AuditLogEntry } from './audit';
export { AUDIT_ACTIONS } from './audit';
```

- [ ] **Step 9: Verify all type tests pass**

Run: `pnpm --filter @i18n-platform/core test`
Expected: All tests PASS

- [ ] **Step 10: Verify build**

Run: `pnpm --filter @i18n-platform/core build`
Expected: Clean build

- [ ] **Step 11: Commit**

```bash
git add packages/core/src/types/
git commit -m "feat(core): add organization, project, user, api-key, mt, context, audit types"
```

---

### Task 5: Core Package — Adapter Interfaces

**Files:**
- Create: `packages/core/src/interfaces/format-adapter.ts`
- Create: `packages/core/src/interfaces/translation-provider.ts`
- Create: `packages/core/src/interfaces/machine-translator.ts`
- Create: `packages/core/src/interfaces/storage-adapter.ts`
- Create: `packages/core/src/interfaces/cache-adapter.ts`
- Create: `packages/core/src/interfaces/notification-adapter.ts`
- Create: `packages/core/src/interfaces/key-extractor.ts`
- Create: `packages/core/src/interfaces/index.ts`
- Test: `packages/core/src/interfaces/format-adapter.test.ts`

- [ ] **Step 1: Write failing test for format adapter contract**

Create `packages/core/src/interfaces/format-adapter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { IFormatAdapter, SerializeOptions } from './format-adapter';
import type { TranslationMap } from '../types';

/**
 * Shared contract test for any IFormatAdapter implementation.
 *
 * Any adapter that implements IFormatAdapter should pass this test suite.
 */
export function runFormatAdapterContractTests(
  name: string,
  createAdapter: () => IFormatAdapter,
  sampleContent: string,
  expectedMap: TranslationMap,
) {
  describe(`IFormatAdapter contract: ${name}`, () => {
    it('should have a non-empty formatId', () => {
      const adapter = createAdapter();
      expect(adapter.formatId).toBeTruthy();
      expect(typeof adapter.formatId).toBe('string');
    });

    it('should have a non-empty fileExtension', () => {
      const adapter = createAdapter();
      expect(adapter.fileExtension).toBeTruthy();
      expect(adapter.fileExtension.startsWith('.')).toBe(true);
    });

    it('should parse content into a TranslationMap', () => {
      const adapter = createAdapter();
      const result = adapter.parse(sampleContent);
      expect(result).toEqual(expectedMap);
    });

    it('should serialize a TranslationMap back to string', () => {
      const adapter = createAdapter();
      const serialized = adapter.serialize(expectedMap);
      expect(typeof serialized).toBe('string');
      expect(serialized.length).toBeGreaterThan(0);
    });

    it('should round-trip: parse(serialize(map)) === map', () => {
      const adapter = createAdapter();
      const serialized = adapter.serialize(expectedMap);
      const parsed = adapter.parse(serialized);
      expect(parsed).toEqual(expectedMap);
    });

    it('should detect its own format', () => {
      const adapter = createAdapter();
      expect(adapter.detect(sampleContent)).toBe(true);
    });
  });
}

// Basic smoke test that the interface file exports correctly
describe('IFormatAdapter interface', () => {
  it('should be importable', async () => {
    const mod = await import('./format-adapter');
    expect(mod).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @i18n-platform/core test -- src/interfaces/format-adapter.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create format adapter interface**

Create `packages/core/src/interfaces/format-adapter.ts`:

```typescript
import type { TranslationMap } from '../types';

/**
 * Options for serializing translations to a file format.
 */
export interface SerializeOptions {
  /** Whether to pretty-print the output (default: true) */
  pretty?: boolean;
  /** Indentation size in spaces (default: 2) */
  indent?: number;
  /** Whether to sort keys alphabetically (default: false) */
  sortKeys?: boolean;
}

/**
 * Adapter interface for parsing and serializing translation file formats.
 *
 * Each implementation handles one file format (JSON, YAML, PO, XLIFF, etc.).
 * Adapters are stateless — all state is in the input/output.
 *
 * @example
 * ```ts
 * const adapter: IFormatAdapter = new JsonFlatAdapter();
 * const map = adapter.parse('{"greeting": "Hello"}');
 * const output = adapter.serialize(map, { pretty: true });
 * ```
 */
export interface IFormatAdapter {
  /** Unique identifier for this format (e.g., "json-flat", "yaml", "xliff") */
  readonly formatId: string;

  /** File extension including the dot (e.g., ".json", ".yaml", ".po") */
  readonly fileExtension: string;

  /**
   * Parse a translation file's content into a flat key-value map.
   *
   * @param content - Raw file content as a string
   * @returns Flat map of translation keys to string values
   * @throws {I18nError} If the content cannot be parsed
   */
  parse(content: string): TranslationMap;

  /**
   * Serialize a flat key-value map into the file format's string representation.
   *
   * @param translations - Flat map of translation keys to string values
   * @param options - Serialization options (pretty print, sort keys, etc.)
   * @returns Formatted file content as a string
   */
  serialize(translations: TranslationMap, options?: SerializeOptions): string;

  /**
   * Detect whether a string is likely in this format.
   *
   * Used for auto-detection during import.
   *
   * @param content - Raw file content to test
   * @returns `true` if the content appears to be in this format
   */
  detect(content: string): boolean;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @i18n-platform/core test -- src/interfaces/format-adapter.test.ts`
Expected: PASS

- [ ] **Step 5: Create translation provider interface**

Create `packages/core/src/interfaces/translation-provider.ts`:

```typescript
import type { Locale, TranslationMap } from '../types';

/**
 * Unsubscribe function returned by event subscriptions.
 */
export type Unsubscribe = () => void;

/**
 * Adapter interface for loading translations at runtime.
 *
 * SDKs use this to fetch translations from the platform API, CDN, or bundled files.
 *
 * @example
 * ```ts
 * const provider: ITranslationProvider = new CdnProvider({ baseUrl: '...' });
 * const translations = await provider.load('fr-FR', 'common');
 * ```
 */
export interface ITranslationProvider {
  /** Unique identifier for this provider (e.g., "api", "cdn", "bundled") */
  readonly providerId: string;

  /**
   * Load translations for a locale and optional namespace.
   *
   * @param locale - The locale to load translations for
   * @param namespace - Optional namespace to scope the load
   * @returns Flat map of translation keys to string values
   */
  load(locale: Locale, namespace?: string): Promise<TranslationMap>;

  /**
   * Subscribe to translation changes (optional — not all providers support this).
   *
   * Used for hot-reload in development and real-time updates.
   *
   * @param callback - Called when translations change for a locale
   * @returns Unsubscribe function
   */
  onChange?(callback: (locale: Locale) => void): Unsubscribe;
}
```

- [ ] **Step 6: Create machine translator interface**

Create `packages/core/src/interfaces/machine-translator.ts`:

```typescript
import type {
  Locale,
  TranslateParams,
  TranslateResult,
  TranslateBatchParams,
  TranslateBatchResult,
  CostEstimate,
} from '../types';

/**
 * Adapter interface for machine translation providers.
 *
 * Each implementation wraps one MT provider (DeepL, Google, OpenAI, etc.).
 * All providers implement the same interface so they can be swapped freely.
 *
 * @example
 * ```ts
 * const mt: IMachineTranslator = new DeepLAdapter({ apiKey: '...' });
 * const result = await mt.translate({
 *   sourceLocale: 'en',
 *   targetLocale: 'fr',
 *   text: 'Hello, world!',
 * });
 * ```
 */
export interface IMachineTranslator {
  /** Unique identifier for this provider (e.g., "deepl", "google", "openai") */
  readonly providerId: string;

  /** List of locales this provider supports */
  readonly supportedLocales: readonly Locale[];

  /**
   * Translate a single text string.
   *
   * @param params - Translation parameters
   * @returns Translation result with translated text and metadata
   * @throws {I18nError} If the provider returns an error
   */
  translate(params: TranslateParams): Promise<TranslateResult>;

  /**
   * Translate multiple texts in a single batch request.
   *
   * More efficient than individual calls for providers that support batching.
   *
   * @param params - Batch translation parameters
   * @returns Batch result with all translations
   */
  translateBatch(params: TranslateBatchParams): Promise<TranslateBatchResult>;

  /**
   * Detect the language of a text string (optional).
   *
   * @param text - Text to detect language for
   * @returns Detected locale
   */
  detectLanguage?(text: string): Promise<Locale>;

  /**
   * Estimate the cost of a translation request (optional).
   *
   * @param params - Translation parameters to estimate
   * @returns Cost estimate in USD
   */
  estimateCost?(params: TranslateParams): Promise<CostEstimate>;
}
```

- [ ] **Step 7: Create storage adapter interface**

Create `packages/core/src/interfaces/storage-adapter.ts`:

```typescript
/**
 * Result of a file upload operation.
 */
export interface UploadResult {
  /** Storage key/path of the uploaded file */
  key: string;
  /** Public URL if available */
  publicUrl: string | null;
  /** Size in bytes */
  size: number;
}

/**
 * A file object in storage.
 */
export interface StorageObject {
  /** Storage key/path */
  key: string;
  /** Size in bytes */
  size: number;
  /** Last modified timestamp (ISO 8601) */
  lastModified: string;
  /** MIME content type */
  contentType: string;
}

/**
 * Adapter interface for file/object storage.
 *
 * Used for CDN publishing (translation bundles) and screenshot storage.
 *
 * @example
 * ```ts
 * const storage: IStorageAdapter = new S3Adapter({ bucket: '...', region: '...' });
 * await storage.upload('i18n/proj/latest/en.json', content, 'application/json');
 * ```
 */
export interface IStorageAdapter {
  /** Unique identifier for this storage backend (e.g., "s3", "r2", "gcs", "local") */
  readonly storageId: string;

  /**
   * Upload a file to storage.
   *
   * @param key - Storage key/path
   * @param content - File content
   * @param contentType - MIME type
   * @returns Upload result with key and URL
   */
  upload(key: string, content: Buffer | string, contentType: string): Promise<UploadResult>;

  /**
   * Download a file from storage.
   *
   * @param key - Storage key/path
   * @returns File content as Buffer
   * @throws {I18nError} If the file does not exist
   */
  download(key: string): Promise<Buffer>;

  /**
   * Delete a file from storage.
   *
   * @param key - Storage key/path
   */
  delete(key: string): Promise<void>;

  /**
   * Get the public URL for a stored file.
   *
   * @param key - Storage key/path
   * @returns Public URL string
   */
  getPublicUrl(key: string): string;

  /**
   * List files in storage under a prefix.
   *
   * @param prefix - Key prefix to filter by
   * @returns Array of storage objects
   */
  list(prefix: string): Promise<StorageObject[]>;
}
```

- [ ] **Step 8: Create cache adapter interface**

Create `packages/core/src/interfaces/cache-adapter.ts`:

```typescript
/**
 * Adapter interface for caching.
 *
 * Used by the API server for response caching and by SDKs for translation caching.
 *
 * @example
 * ```ts
 * const cache: ICacheAdapter = new RedisAdapter(redisClient);
 * await cache.set('translations:en', data, 60_000);
 * const cached = await cache.get<TranslationMap>('translations:en');
 * ```
 */
export interface ICacheAdapter {
  /**
   * Get a cached value by key.
   *
   * @param key - Cache key
   * @returns The cached value, or `null` if not found or expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in the cache.
   *
   * @param key - Cache key
   * @param value - Value to cache (must be JSON-serializable)
   * @param ttlMs - Time to live in milliseconds (optional — no TTL means cache forever)
   */
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

  /**
   * Delete a cached value.
   *
   * @param key - Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Invalidate all keys matching a pattern.
   *
   * @param pattern - Glob pattern (e.g., "translations:proj_123:*")
   */
  invalidatePattern(pattern: string): Promise<void>;
}
```

- [ ] **Step 9: Create notification adapter interface**

Create `packages/core/src/interfaces/notification-adapter.ts`:

```typescript
/**
 * A notification to send through an adapter.
 */
export interface Notification {
  /** Notification title/subject */
  title: string;
  /** Notification body (plain text or markdown) */
  body: string;
  /** Recipient identifier (email, channel, URL — depends on adapter) */
  recipient: string;
  /** Optional metadata for the adapter */
  metadata?: Record<string, unknown>;
}

/**
 * Adapter interface for sending notifications.
 *
 * Used to alert on translation events (new keys, review needed, published, etc.).
 *
 * @example
 * ```ts
 * const notifier: INotificationAdapter = new SlackAdapter({ webhookUrl: '...' });
 * await notifier.send({
 *   title: 'New keys added',
 *   body: '15 new translation keys were pushed to project X',
 *   recipient: '#i18n-updates',
 * });
 * ```
 */
export interface INotificationAdapter {
  /** Unique identifier for this notification channel (e.g., "email", "slack", "webhook") */
  readonly channelId: string;

  /**
   * Send a notification.
   *
   * @param notification - The notification to send
   * @throws {I18nError} If delivery fails
   */
  send(notification: Notification): Promise<void>;
}
```

- [ ] **Step 10: Create key extractor interface**

Create `packages/core/src/interfaces/key-extractor.ts`:

```typescript
import type { TranslationKey } from '../types';

/**
 * A translation key extracted from source code.
 */
export interface ExtractedKey {
  /** The translation key string */
  key: TranslationKey;
  /** Default value if found in code (e.g., `t("key", "Default text")`) */
  defaultValue: string | null;
  /** The namespace if extractable from code */
  namespace: string | null;
  /** Source file path */
  filePath: string;
  /** Line number in the source file */
  line: number;
  /** Column number in the source file */
  column: number;
}

/**
 * Result of running a key extractor on source code.
 */
export interface ExtractionResult {
  /** All keys found in the source */
  keys: ExtractedKey[];
  /** Any warnings (e.g., dynamic keys that can't be statically extracted) */
  warnings: ExtractionWarning[];
}

/**
 * A warning produced during key extraction.
 */
export interface ExtractionWarning {
  /** Warning message */
  message: string;
  /** Source file path */
  filePath: string;
  /** Line number */
  line: number;
}

/**
 * Adapter interface for extracting translation keys from source code.
 *
 * Each implementation handles a specific framework/pattern
 * (React `t()`, vanilla JS `i18n.t()`, etc.).
 *
 * @example
 * ```ts
 * const extractor: IKeyExtractor = new ReactExtractor();
 * const result = extractor.extract(sourceCode, 'src/components/Login.tsx');
 * // result.keys = [{ key: 'auth.login.title', ... }, ...]
 * ```
 */
export interface IKeyExtractor {
  /** Unique identifier for this extractor (e.g., "react", "vanilla-js", "node") */
  readonly extractorId: string;

  /** File extensions this extractor can process (e.g., [".tsx", ".jsx"]) */
  readonly supportedFileTypes: readonly string[];

  /**
   * Extract translation keys from a source code string.
   *
   * @param sourceCode - The file contents to scan
   * @param filePath - Path of the file (for error reporting and namespace inference)
   * @returns Extraction result with keys and warnings
   */
  extract(sourceCode: string, filePath: string): ExtractionResult;
}
```

- [ ] **Step 11: Create interfaces barrel export**

Create `packages/core/src/interfaces/index.ts`:

```typescript
export type { IFormatAdapter, SerializeOptions } from './format-adapter';
export type { ITranslationProvider, Unsubscribe } from './translation-provider';
export type { IMachineTranslator } from './machine-translator';
export type {
  IStorageAdapter,
  UploadResult,
  StorageObject,
} from './storage-adapter';
export type { ICacheAdapter } from './cache-adapter';
export type { INotificationAdapter, Notification } from './notification-adapter';
export type {
  IKeyExtractor,
  ExtractedKey,
  ExtractionResult,
  ExtractionWarning,
} from './key-extractor';
```

- [ ] **Step 12: Run interface tests**

Run: `pnpm --filter @i18n-platform/core test -- src/interfaces/`
Expected: All tests PASS

- [ ] **Step 13: Commit**

```bash
git add packages/core/src/interfaces/
git commit -m "feat(core): add all adapter interfaces — format, provider, MT, storage, cache, notification, extractor"
```

---

### Task 6: Core Package — Zod Validation Schemas

**Files:**
- Create: `packages/core/src/schemas/locale.schema.ts`
- Create: `packages/core/src/schemas/translation.schema.ts`
- Create: `packages/core/src/schemas/project.schema.ts`
- Create: `packages/core/src/schemas/organization.schema.ts`
- Create: `packages/core/src/schemas/user.schema.ts`
- Create: `packages/core/src/schemas/api-key.schema.ts`
- Create: `packages/core/src/schemas/mt.schema.ts`
- Create: `packages/core/src/schemas/import-export.schema.ts`
- Create: `packages/core/src/schemas/index.ts`
- Test: `packages/core/src/schemas/schemas.test.ts`

- [ ] **Step 1: Write failing tests for schemas**

Create `packages/core/src/schemas/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  LocaleSchema,
  TranslationKeySchema,
  TranslationStatusSchema,
  CreateProjectSchema,
  UpdateTranslationSchema,
  CreateOrganizationSchema,
  CreateUserSchema,
  CreateApiKeySchema,
  MachineTranslationConfigSchema,
  ImportFileSchema,
  ProjectConfigSchema,
} from './index';

describe('Zod Schemas', () => {
  describe('LocaleSchema', () => {
    it('should accept valid locales', () => {
      expect(LocaleSchema.parse('en')).toBe('en');
      expect(LocaleSchema.parse('en-US')).toBe('en-US');
      expect(LocaleSchema.parse('zh-Hans-CN')).toBe('zh-Hans-CN');
    });

    it('should reject invalid locales', () => {
      expect(() => LocaleSchema.parse('')).toThrow();
      expect(() => LocaleSchema.parse('english')).toThrow();
      expect(() => LocaleSchema.parse('en_US')).toThrow();
    });
  });

  describe('TranslationKeySchema', () => {
    it('should accept valid keys', () => {
      expect(TranslationKeySchema.parse('greeting')).toBe('greeting');
      expect(TranslationKeySchema.parse('auth.login.title')).toBe('auth.login.title');
    });

    it('should reject invalid keys', () => {
      expect(() => TranslationKeySchema.parse('')).toThrow();
      expect(() => TranslationKeySchema.parse('.leading')).toThrow();
      expect(() => TranslationKeySchema.parse('has space')).toThrow();
    });
  });

  describe('TranslationStatusSchema', () => {
    it('should accept valid statuses', () => {
      expect(TranslationStatusSchema.parse('untranslated')).toBe('untranslated');
      expect(TranslationStatusSchema.parse('approved')).toBe('approved');
    });

    it('should reject invalid statuses', () => {
      expect(() => TranslationStatusSchema.parse('invalid')).toThrow();
    });
  });

  describe('CreateProjectSchema', () => {
    it('should accept valid project creation payload', () => {
      const result = CreateProjectSchema.parse({
        name: 'My App',
        slug: 'my-app',
        defaultLocale: 'en',
        supportedLocales: ['en', 'fr', 'de'],
        delivery: 'cdn',
      });
      expect(result.name).toBe('My App');
      expect(result.supportedLocales).toHaveLength(3);
    });

    it('should reject missing required fields', () => {
      expect(() => CreateProjectSchema.parse({ name: 'My App' })).toThrow();
    });

    it('should reject empty supported locales', () => {
      expect(() =>
        CreateProjectSchema.parse({
          name: 'My App',
          slug: 'my-app',
          defaultLocale: 'en',
          supportedLocales: [],
          delivery: 'cdn',
        }),
      ).toThrow();
    });
  });

  describe('UpdateTranslationSchema', () => {
    it('should accept a value update', () => {
      const result = UpdateTranslationSchema.parse({
        value: 'Bonjour',
      });
      expect(result.value).toBe('Bonjour');
    });

    it('should accept a status update', () => {
      const result = UpdateTranslationSchema.parse({
        value: 'Bonjour',
        status: 'reviewed',
      });
      expect(result.status).toBe('reviewed');
    });
  });

  describe('CreateOrganizationSchema', () => {
    it('should accept valid org creation', () => {
      const result = CreateOrganizationSchema.parse({
        name: 'My Org',
        slug: 'my-org',
      });
      expect(result.name).toBe('My Org');
    });

    it('should reject slugs with spaces', () => {
      expect(() =>
        CreateOrganizationSchema.parse({
          name: 'My Org',
          slug: 'my org',
        }),
      ).toThrow();
    });
  });

  describe('CreateApiKeySchema', () => {
    it('should accept valid API key creation', () => {
      const result = CreateApiKeySchema.parse({
        name: 'Production SDK',
        environment: 'production',
        scopes: {
          translations: 'read',
          keys: 'read',
          importExport: false,
          mt: false,
          publish: false,
        },
      });
      expect(result.environment).toBe('production');
    });
  });

  describe('MachineTranslationConfigSchema', () => {
    it('should accept valid MT config', () => {
      const result = MachineTranslationConfigSchema.parse({
        enabled: true,
        defaultProvider: 'deepl',
        autoTranslateOnKeyCreate: true,
        routing: {
          strategy: 'user_choice',
          rules: [],
        },
        autoApprove: {
          enabled: false,
          qualityThreshold: 0.85,
        },
        costLimits: {
          monthlyBudget: 100,
          perRequestLimit: 5,
          alertThreshold: 80,
        },
      });
      expect(result.enabled).toBe(true);
    });

    it('should reject quality threshold > 1', () => {
      expect(() =>
        MachineTranslationConfigSchema.parse({
          enabled: true,
          defaultProvider: 'deepl',
          autoTranslateOnKeyCreate: false,
          routing: { strategy: 'user_choice', rules: [] },
          autoApprove: { enabled: true, qualityThreshold: 1.5 },
          costLimits: { monthlyBudget: 100, perRequestLimit: 5, alertThreshold: 80 },
        }),
      ).toThrow();
    });
  });

  describe('ImportFileSchema', () => {
    it('should accept valid import payload', () => {
      const result = ImportFileSchema.parse({
        locale: 'fr',
        format: 'json-flat',
        content: '{"greeting": "Bonjour"}',
        conflictStrategy: 'skip',
      });
      expect(result.format).toBe('json-flat');
    });
  });

  describe('ProjectConfigSchema', () => {
    it('should accept valid project config', () => {
      const result = ProjectConfigSchema.parse({
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        apiUrl: 'https://i18n.example.com/api',
        apiKey: 'key_123',
        defaultLocale: 'en',
        supportedLocales: ['en', 'fr'],
        namespaces: ['common'],
        delivery: 'cdn',
        source: {
          paths: ['./src'],
          extractors: ['react'],
          ignore: ['**/*.test.*'],
        },
        output: {
          path: './public/locales',
          format: 'json-nested',
          splitByNamespace: true,
        },
        validation: {
          missingKeys: 'error',
          unusedKeys: 'warn',
          interpolationMismatch: 'error',
          minCoverage: 95,
        },
      });
      expect(result.projectId).toBeTruthy();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @i18n-platform/core test -- src/schemas/schemas.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement locale schema**

Create `packages/core/src/schemas/locale.schema.ts`:

```typescript
import { z } from 'zod';
import { isValidLocale } from '../types/locale';
import { isValidTranslationKey } from '../types/translation';

/**
 * Zod schema for a BCP-47 locale string.
 */
export const LocaleSchema = z.string().refine(isValidLocale, {
  message: 'Must be a valid BCP-47 locale (e.g., "en", "en-US", "zh-Hans-CN")',
});

/**
 * Zod schema for a dot-separated translation key.
 */
export const TranslationKeySchema = z.string().refine(isValidTranslationKey, {
  message: 'Must be a valid dot-separated key (e.g., "auth.login.title")',
});

/**
 * Zod schema for translation status.
 */
export const TranslationStatusSchema = z.enum([
  'untranslated',
  'machine_translated',
  'needs_review',
  'reviewed',
  'approved',
  'published',
]);

/**
 * Zod schema for delivery mode.
 */
export const DeliveryModeSchema = z.enum(['api', 'cdn', 'bundled']);

/**
 * Zod schema for URL-safe slugs.
 */
export const SlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a lowercase URL-safe slug (e.g., "my-project")');
```

- [ ] **Step 4: Implement translation schema**

Create `packages/core/src/schemas/translation.schema.ts`:

```typescript
import { z } from 'zod';
import { TranslationKeySchema, TranslationStatusSchema, LocaleSchema } from './locale.schema';

/**
 * Schema for updating a single translation.
 */
export const UpdateTranslationSchema = z.object({
  value: z.string(),
  status: TranslationStatusSchema.optional(),
});

/**
 * Schema for bulk updating translations.
 */
export const BulkUpdateTranslationsSchema = z.object({
  translations: z.array(
    z.object({
      keyId: z.string().uuid(),
      locale: LocaleSchema,
      value: z.string(),
      status: TranslationStatusSchema.optional(),
    }),
  ).min(1).max(1000),
});

/**
 * Schema for creating translation keys (bulk).
 */
export const CreateKeysSchema = z.object({
  keys: z.array(
    z.object({
      key: TranslationKeySchema,
      defaultValue: z.string().optional(),
      description: z.string().optional(),
      namespace: z.string().optional(),
      maxLength: z.number().int().positive().optional(),
    }),
  ).min(1).max(5000),
});

/**
 * Schema for reviewing a translation.
 */
export const ReviewTranslationSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  comment: z.string().max(1000).optional(),
});
```

- [ ] **Step 5: Implement project schema**

Create `packages/core/src/schemas/project.schema.ts`:

```typescript
import { z } from 'zod';
import { LocaleSchema, DeliveryModeSchema, SlugSchema } from './locale.schema';

/**
 * Schema for creating a new project.
 */
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  slug: SlugSchema,
  defaultLocale: LocaleSchema,
  supportedLocales: z.array(LocaleSchema).min(1),
  delivery: DeliveryModeSchema,
  settings: z
    .object({
      autoTranslateOnPush: z.boolean().default(false),
      requireReview: z.boolean().default(true),
      minCoverageForPublish: z.number().min(0).max(100).default(0),
    })
    .optional(),
});

/**
 * Schema for updating project settings.
 */
export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  delivery: DeliveryModeSchema.optional(),
  settings: z
    .object({
      autoTranslateOnPush: z.boolean().optional(),
      requireReview: z.boolean().optional(),
      minCoverageForPublish: z.number().min(0).max(100).optional(),
    })
    .optional(),
});

/**
 * Schema for the CLI/SDK project config file (i18n.config.ts).
 */
export const ProjectConfigSchema = z.object({
  projectId: z.string().uuid(),
  apiUrl: z.string().url(),
  apiKey: z.string().min(1),
  defaultLocale: LocaleSchema,
  supportedLocales: z.array(LocaleSchema).min(1),
  namespaces: z.array(z.string().min(1)).default(['common']),
  delivery: DeliveryModeSchema,
  source: z.object({
    paths: z.array(z.string()).min(1),
    extractors: z.array(z.string()).min(1),
    ignore: z.array(z.string()).default([]),
  }),
  output: z.object({
    path: z.string().min(1),
    format: z.string().min(1),
    splitByNamespace: z.boolean().default(false),
  }),
  machineTranslation: z
    .object({
      enabled: z.boolean(),
      provider: z.string(),
      autoTranslateOnPush: z.boolean().default(false),
    })
    .optional(),
  validation: z.object({
    missingKeys: z.enum(['error', 'warn', 'off']),
    unusedKeys: z.enum(['error', 'warn', 'off']),
    interpolationMismatch: z.enum(['error', 'warn', 'off']),
    minCoverage: z.number().min(0).max(100),
  }),
});
```

- [ ] **Step 6: Implement organization schema**

Create `packages/core/src/schemas/organization.schema.ts`:

```typescript
import { z } from 'zod';
import { SlugSchema } from './locale.schema';

/**
 * Schema for creating a new organization.
 */
export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  slug: SlugSchema,
});

/**
 * Schema for updating an organization.
 */
export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  settings: z
    .object({
      defaultMtProvider: z.string().optional(),
      defaultDeliveryMode: z.string().optional(),
      maxProjects: z.number().int().positive().optional(),
    })
    .optional(),
});

/**
 * Schema for inviting a member.
 */
export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'developer', 'translator', 'reviewer']),
  permissions: z
    .object({
      projects: z.record(
        z.string().uuid(),
        z.object({
          role: z.enum(['admin', 'developer', 'translator', 'reviewer']),
          locales: z.union([z.array(z.string()), z.literal('*')]).default('*'),
          namespaces: z.union([z.array(z.string()), z.literal('*')]).default('*'),
        }),
      ),
    })
    .optional(),
});
```

- [ ] **Step 7: Implement user schema**

Create `packages/core/src/schemas/user.schema.ts`:

```typescript
import { z } from 'zod';

/**
 * Schema for creating a new user account.
 */
export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
});

/**
 * Schema for user login.
 */
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Schema for updating user preferences.
 */
export const UpdateUserPreferencesSchema = z.object({
  dashboardLocale: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  emailNotifications: z.boolean().optional(),
});
```

- [ ] **Step 8: Implement API key schema**

Create `packages/core/src/schemas/api-key.schema.ts`:

```typescript
import { z } from 'zod';

/**
 * Schema for creating a new API key.
 */
export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(200),
  environment: z.enum(['development', 'staging', 'production']),
  scopes: z.object({
    translations: z.enum(['read', 'read_write']),
    keys: z.enum(['read', 'read_write']),
    importExport: z.boolean(),
    mt: z.boolean(),
    publish: z.boolean(),
  }),
  expiresAt: z.string().datetime().optional(),
});
```

- [ ] **Step 9: Implement MT config schema**

Create `packages/core/src/schemas/mt.schema.ts`:

```typescript
import { z } from 'zod';
import { LocaleSchema } from './locale.schema';

/**
 * Schema for MT routing rules.
 */
const MtRoutingRuleSchema = z.object({
  sourceLocale: LocaleSchema,
  targetLocale: LocaleSchema,
  provider: z.string().min(1),
  priority: z.number().int().min(0),
});

/**
 * Schema for full machine translation configuration.
 */
export const MachineTranslationConfigSchema = z.object({
  enabled: z.boolean(),
  defaultProvider: z.string().min(1),
  autoTranslateOnKeyCreate: z.boolean(),
  routing: z.object({
    strategy: z.enum(['user_choice', 'smart', 'fallback_chain']),
    rules: z.array(MtRoutingRuleSchema),
  }),
  autoApprove: z.object({
    enabled: z.boolean(),
    qualityThreshold: z.number().min(0).max(1),
  }),
  costLimits: z.object({
    monthlyBudget: z.number().min(0),
    perRequestLimit: z.number().min(0),
    alertThreshold: z.number().min(0).max(100),
  }),
});

/**
 * Schema for triggering machine translation.
 */
export const TriggerMtSchema = z.object({
  locale: LocaleSchema,
  provider: z.string().optional(),
  keyIds: z.array(z.string().uuid()).optional(),
});
```

- [ ] **Step 10: Implement import/export schema**

Create `packages/core/src/schemas/import-export.schema.ts`:

```typescript
import { z } from 'zod';
import { LocaleSchema } from './locale.schema';

/** Supported import/export formats */
export const FORMAT_IDS = [
  'json-flat',
  'json-nested',
  'yaml',
  'po',
  'xliff',
  'android-xml',
  'ios-strings',
] as const;

/**
 * Schema for importing a translation file.
 */
export const ImportFileSchema = z.object({
  locale: LocaleSchema,
  format: z.enum(FORMAT_IDS),
  content: z.string().min(1),
  namespace: z.string().optional(),
  conflictStrategy: z.enum(['skip', 'overwrite', 'keep_newer']).default('skip'),
});

/**
 * Schema for export query parameters.
 */
export const ExportQuerySchema = z.object({
  locale: LocaleSchema.optional(),
  format: z.enum(FORMAT_IDS).default('json-nested'),
  namespace: z.string().optional(),
  statusFilter: z.enum(['all', 'approved', 'published']).default('all'),
});
```

- [ ] **Step 11: Create schemas barrel export**

Create `packages/core/src/schemas/index.ts`:

```typescript
export {
  LocaleSchema,
  TranslationKeySchema,
  TranslationStatusSchema,
  DeliveryModeSchema,
  SlugSchema,
} from './locale.schema';

export {
  UpdateTranslationSchema,
  BulkUpdateTranslationsSchema,
  CreateKeysSchema,
  ReviewTranslationSchema,
} from './translation.schema';

export {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectConfigSchema,
} from './project.schema';

export {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  InviteMemberSchema,
} from './organization.schema';

export {
  CreateUserSchema,
  LoginSchema,
  UpdateUserPreferencesSchema,
} from './user.schema';

export { CreateApiKeySchema } from './api-key.schema';

export { MachineTranslationConfigSchema, TriggerMtSchema } from './mt.schema';

export { ImportFileSchema, ExportQuerySchema, FORMAT_IDS } from './import-export.schema';
```

- [ ] **Step 12: Run schema tests**

Run: `pnpm --filter @i18n-platform/core test -- src/schemas/schemas.test.ts`
Expected: All tests PASS

- [ ] **Step 13: Commit**

```bash
git add packages/core/src/schemas/
git commit -m "feat(core): add Zod validation schemas for all API payloads and configs"
```

---

### Task 7: Core Package — Error Types

**Files:**
- Create: `packages/core/src/errors/i18n-error.ts`
- Create: `packages/core/src/errors/index.ts`
- Test: `packages/core/src/errors/i18n-error.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/core/src/errors/i18n-error.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  I18nError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
} from './i18n-error';

describe('I18nError', () => {
  it('should create a base error with code and status', () => {
    const error = new I18nError('Something went wrong', 'INTERNAL_ERROR', 500);
    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('I18nError');
    expect(error instanceof Error).toBe(true);
  });

  it('should include optional details', () => {
    const error = new I18nError('Bad input', 'VALIDATION_ERROR', 400, {
      field: 'email',
    });
    expect(error.details).toEqual({ field: 'email' });
  });
});

describe('NotFoundError', () => {
  it('should default to 404 status', () => {
    const error = new NotFoundError('Project not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
  });
});

describe('ValidationError', () => {
  it('should default to 400 status', () => {
    const error = new ValidationError('Invalid locale');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('AuthenticationError', () => {
  it('should default to 401 status', () => {
    const error = new AuthenticationError('Invalid token');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTHENTICATION_ERROR');
  });
});

describe('AuthorizationError', () => {
  it('should default to 403 status', () => {
    const error = new AuthorizationError('Insufficient permissions');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('AUTHORIZATION_ERROR');
  });
});

describe('ConflictError', () => {
  it('should default to 409 status', () => {
    const error = new ConflictError('Key already exists');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });
});

describe('RateLimitError', () => {
  it('should default to 429 status with retry info', () => {
    const error = new RateLimitError('Too many requests', 60);
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(error.retryAfterSeconds).toBe(60);
  });
});

describe('ExternalServiceError', () => {
  it('should default to 502 status with service name', () => {
    const error = new ExternalServiceError('DeepL API failed', 'deepl');
    expect(error.statusCode).toBe(502);
    expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(error.service).toBe('deepl');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @i18n-platform/core test -- src/errors/i18n-error.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement error types**

Create `packages/core/src/errors/i18n-error.ts`:

```typescript
/**
 * Base error class for the i18n platform.
 *
 * All custom errors extend this. Includes an error code and HTTP status code
 * for consistent API error responses.
 */
export class I18nError extends Error {
  /** Machine-readable error code (e.g., "NOT_FOUND", "VALIDATION_ERROR") */
  readonly code: string;
  /** HTTP status code for API responses */
  readonly statusCode: number;
  /** Optional structured details about the error */
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'I18nError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serialize the error for API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

/**
 * Resource not found (HTTP 404).
 */
export class NotFoundError extends I18nError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

/**
 * Validation failed (HTTP 400).
 */
export class ValidationError extends I18nError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication required or failed (HTTP 401).
 */
export class AuthenticationError extends I18nError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

/**
 * Insufficient permissions (HTTP 403).
 */
export class AuthorizationError extends I18nError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
    this.name = 'AuthorizationError';
  }
}

/**
 * Resource conflict (HTTP 409).
 */
export class ConflictError extends I18nError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit exceeded (HTTP 429).
 */
export class RateLimitError extends I18nError {
  /** Seconds until the client can retry */
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number, details?: Record<string, unknown>) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, details);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * External service failure (HTTP 502).
 *
 * Used when an MT provider, storage service, or email service fails.
 */
export class ExternalServiceError extends I18nError {
  /** Name of the failing service */
  readonly service: string;

  constructor(message: string, service: string, details?: Record<string, unknown>) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, details);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}
```

- [ ] **Step 4: Create errors barrel export**

Create `packages/core/src/errors/index.ts`:

```typescript
export {
  I18nError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
} from './i18n-error';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @i18n-platform/core test -- src/errors/i18n-error.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/errors/
git commit -m "feat(core): add typed error hierarchy — I18nError base with NotFound, Validation, Auth, RateLimit, ExternalService"
```

---

### Task 8: Core Package — Final Assembly & Root Export

**Files:**
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Update root barrel export**

Replace `packages/core/src/index.ts` with:

```typescript
/**
 * @i18n-platform/core
 *
 * Shared types, interfaces, adapter contracts, validation schemas,
 * and error types for the i18n automation platform.
 *
 * @packageDocumentation
 */

// ── Types ──────────────────────────────────────────────────
export * from './types';

// ── Interfaces (Adapter Contracts) ─────────────────────────
export * from './interfaces';

// ── Validation Schemas (Zod) ───────────────────────────────
export * from './schemas';

// ── Errors ─────────────────────────────────────────────────
export * from './errors';
```

- [ ] **Step 2: Run all core tests**

Run: `pnpm --filter @i18n-platform/core test`
Expected: All tests PASS

- [ ] **Step 3: Build the package**

Run: `pnpm --filter @i18n-platform/core build`
Expected: Clean build producing `dist/` with `.js`, `.cjs`, `.d.ts` files

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts
git commit -m "feat(core): finalize core package public API — types, interfaces, schemas, errors"
```

---

### Task 9: Database Package — Project Setup

**Files:**
- Create: `packages/database/package.json`
- Create: `packages/database/tsconfig.json`
- Create: `packages/database/tsup.config.ts`
- Create: `packages/database/vitest.config.ts`
- Create: `packages/database/drizzle.config.ts`
- Create: `packages/database/src/index.ts`
- Create: `packages/database/src/connection.ts`

- [ ] **Step 1: Create `packages/database/package.json`**

```json
{
  "name": "@i18n-platform/database",
  "version": "0.1.0",
  "description": "Drizzle ORM schema, migrations, and database utilities for i18n-platform",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": ["dist", "drizzle"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/seed.ts"
  },
  "dependencies": {
    "@i18n-platform/core": "workspace:*",
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "tsup": "^8.3.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/database/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `packages/database/tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  external: ['postgres'],
});
```

- [ ] **Step 4: Create `packages/database/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/index.ts', 'src/seed.ts'],
    },
  },
});
```

- [ ] **Step 5: Create `packages/database/drizzle.config.ts`**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://i18n:i18n@localhost:5432/i18n_platform',
  },
});
```

- [ ] **Step 6: Create `packages/database/src/connection.ts`**

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Options for creating a database connection.
 */
export interface ConnectionOptions {
  /** PostgreSQL connection URL */
  url: string;
  /** Maximum number of connections in the pool */
  maxConnections?: number;
  /** Enable query logging (default: false) */
  logging?: boolean;
}

/**
 * Create a database connection and Drizzle ORM instance.
 *
 * @param options - Connection configuration
 * @returns Drizzle ORM database instance
 *
 * @example
 * ```ts
 * const db = createConnection({
 *   url: process.env.DATABASE_URL!,
 *   maxConnections: 10,
 * });
 * ```
 */
export function createConnection(options: ConnectionOptions) {
  const client = postgres(options.url, {
    max: options.maxConnections ?? 10,
    onnotice: () => {}, // suppress notices
  });

  return drizzle(client, {
    schema,
    logger: options.logging ?? false,
  });
}

/** Type of the database instance returned by createConnection */
export type Database = ReturnType<typeof createConnection>;
```

- [ ] **Step 7: Create placeholder index**

Create `packages/database/src/index.ts`:

```typescript
/**
 * @i18n-platform/database
 *
 * Drizzle ORM schema, connection factory, and database utilities
 * for the i18n automation platform.
 *
 * @packageDocumentation
 */

export { createConnection } from './connection';
export type { Database, ConnectionOptions } from './connection';

// Schema will be exported here as tables are created
```

- [ ] **Step 8: Install dependencies**

Run: `cd "E:/Web dev/projects/i18n" && pnpm install`

- [ ] **Step 9: Commit**

```bash
git add packages/database/
git commit -m "chore(database): scaffold database package with drizzle, postgres.js, tsup"
```

---

### Task 10: Database Package — Schema (Organizations, Users, Members)

**Files:**
- Create: `packages/database/src/schema/organizations.ts`
- Create: `packages/database/src/schema/users.ts`
- Create: `packages/database/src/schema/org-members.ts`
- Create: `packages/database/src/schema/index.ts`
- Test: `packages/database/src/schema/schema.test.ts`

- [ ] **Step 1: Write failing test for schema column checks**

Create `packages/database/src/schema/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import { organizations } from './organizations';
import { users } from './users';
import { orgMembers } from './org-members';

describe('Database Schema', () => {
  describe('organizations table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(organizations);
      expect(columns.id).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.slug).toBeDefined();
      expect(columns.settings).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });
  });

  describe('users table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(users);
      expect(columns.id).toBeDefined();
      expect(columns.email).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.passwordHash).toBeDefined();
      expect(columns.avatarUrl).toBeDefined();
      expect(columns.preferences).toBeDefined();
      expect(columns.createdAt).toBeDefined();
    });
  });

  describe('orgMembers table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(orgMembers);
      expect(columns.id).toBeDefined();
      expect(columns.orgId).toBeDefined();
      expect(columns.userId).toBeDefined();
      expect(columns.role).toBeDefined();
      expect(columns.permissions).toBeDefined();
      expect(columns.joinedAt).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @i18n-platform/database test -- src/schema/schema.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement organizations table**

Create `packages/database/src/schema/organizations.ts`:

```typescript
import { pgTable, uuid, varchar, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Organizations table — the top-level tenant boundary.
 *
 * Each organization has its own projects, members, and settings.
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    settings: jsonb('settings').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('organizations_slug_idx').on(table.slug),
  ],
);
```

- [ ] **Step 4: Implement users table**

Create `packages/database/src/schema/users.ts`:

```typescript
import { pgTable, uuid, varchar, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Users table — platform user accounts.
 *
 * A user can belong to multiple organizations via org_members.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    avatarUrl: varchar('avatar_url', { length: 2048 }),
    preferences: jsonb('preferences').notNull().default({
      dashboardLocale: 'en',
      theme: 'system',
      emailNotifications: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
  ],
);
```

- [ ] **Step 5: Implement org_members table**

Create `packages/database/src/schema/org-members.ts`:

```typescript
import { pgTable, uuid, varchar, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Organization members table — links users to organizations with roles.
 *
 * Each row represents a user's membership in an org, including their
 * org-level role and granular per-project permissions.
 */
export const orgMembers = pgTable(
  'org_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 20 }).notNull().default('developer'),
    permissions: jsonb('permissions').notNull().default({ projects: {} }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('org_members_org_user_idx').on(table.orgId, table.userId),
  ],
);
```

- [ ] **Step 6: Create schema barrel export**

Create `packages/database/src/schema/index.ts`:

```typescript
export { organizations } from './organizations';
export { users } from './users';
export { orgMembers } from './org-members';
```

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @i18n-platform/database test -- src/schema/schema.test.ts`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/database/src/schema/
git commit -m "feat(database): add organizations, users, org_members tables"
```

---

### Task 11: Database Package — Schema (Projects, Locales, Namespaces)

**Files:**
- Create: `packages/database/src/schema/projects.ts`
- Create: `packages/database/src/schema/project-locales.ts`
- Create: `packages/database/src/schema/namespaces.ts`
- Modify: `packages/database/src/schema/index.ts`
- Modify: `packages/database/src/schema/schema.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `packages/database/src/schema/schema.test.ts`:

```typescript
import { projects } from './projects';
import { projectLocales } from './project-locales';
import { namespaces } from './namespaces';

// Add these test blocks inside the 'Database Schema' describe:

  describe('projects table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(projects);
      expect(columns.id).toBeDefined();
      expect(columns.orgId).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.slug).toBeDefined();
      expect(columns.defaultLocale).toBeDefined();
      expect(columns.deliveryMode).toBeDefined();
      expect(columns.settings).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });
  });

  describe('projectLocales table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(projectLocales);
      expect(columns.id).toBeDefined();
      expect(columns.projectId).toBeDefined();
      expect(columns.locale).toBeDefined();
      expect(columns.enabled).toBeDefined();
      expect(columns.coveragePercent).toBeDefined();
      expect(columns.lastSyncedAt).toBeDefined();
    });
  });

  describe('namespaces table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(namespaces);
      expect(columns.id).toBeDefined();
      expect(columns.projectId).toBeDefined();
      expect(columns.name).toBeDefined();
      expect(columns.description).toBeDefined();
      expect(columns.sortOrder).toBeDefined();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @i18n-platform/database test -- src/schema/schema.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement projects table**

Create `packages/database/src/schema/projects.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

/**
 * Projects table — an i18n project within an organization.
 *
 * Each project has its own locales, namespaces, translation keys,
 * and delivery configuration.
 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    defaultLocale: varchar('default_locale', { length: 35 }).notNull(),
    deliveryMode: varchar('delivery_mode', { length: 20 }).notNull().default('cdn'),
    settings: jsonb('settings').notNull().default({
      autoTranslateOnPush: false,
      requireReview: true,
      minCoverageForPublish: 0,
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('projects_org_slug_idx').on(table.orgId, table.slug),
    index('projects_org_id_idx').on(table.orgId),
  ],
);
```

- [ ] **Step 4: Implement project_locales table**

Create `packages/database/src/schema/project-locales.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  real,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

/**
 * Project locales table — locales enabled for a project with coverage stats.
 */
export const projectLocales = pgTable(
  'project_locales',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 35 }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    coveragePercent: real('coverage_percent').notNull().default(0),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('project_locales_project_locale_idx').on(table.projectId, table.locale),
  ],
);
```

- [ ] **Step 5: Implement namespaces table**

Create `packages/database/src/schema/namespaces.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

/**
 * Namespaces table — groups of translation keys within a project.
 *
 * @example "common", "auth", "dashboard", "emails"
 */
export const namespaces = pgTable(
  'namespaces',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    uniqueIndex('namespaces_project_name_idx').on(table.projectId, table.name),
  ],
);
```

- [ ] **Step 6: Update schema barrel export**

Add to `packages/database/src/schema/index.ts`:

```typescript
export { projects } from './projects';
export { projectLocales } from './project-locales';
export { namespaces } from './namespaces';
```

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @i18n-platform/database test -- src/schema/schema.test.ts`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/database/src/schema/
git commit -m "feat(database): add projects, project_locales, namespaces tables"
```

---

### Task 12: Database Package — Schema (Keys, Translations, History)

**Files:**
- Create: `packages/database/src/schema/translation-keys.ts`
- Create: `packages/database/src/schema/translations.ts`
- Create: `packages/database/src/schema/translation-history.ts`
- Modify: `packages/database/src/schema/index.ts`
- Modify: `packages/database/src/schema/schema.test.ts`

- [ ] **Step 1: Add failing tests for new tables**

Append test blocks for `translationKeys`, `translations`, `translationHistory` to `schema.test.ts` following the same pattern: import the table, `getTableColumns()`, assert required columns exist.

Add these imports at the top:

```typescript
import { translationKeys } from './translation-keys';
import { translations } from './translations';
import { translationHistory } from './translation-history';
```

Add these test blocks:

```typescript
  describe('translationKeys table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(translationKeys);
      expect(columns.id).toBeDefined();
      expect(columns.projectId).toBeDefined();
      expect(columns.namespaceId).toBeDefined();
      expect(columns.key).toBeDefined();
      expect(columns.defaultValue).toBeDefined();
      expect(columns.description).toBeDefined();
      expect(columns.maxLength).toBeDefined();
      expect(columns.metadata).toBeDefined();
      expect(columns.isArchived).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });
  });

  describe('translations table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(translations);
      expect(columns.id).toBeDefined();
      expect(columns.keyId).toBeDefined();
      expect(columns.locale).toBeDefined();
      expect(columns.value).toBeDefined();
      expect(columns.status).toBeDefined();
      expect(columns.translatedBy).toBeDefined();
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });
  });

  describe('translationHistory table', () => {
    it('should have required columns', () => {
      const columns = getTableColumns(translationHistory);
      expect(columns.id).toBeDefined();
      expect(columns.translationId).toBeDefined();
      expect(columns.oldValue).toBeDefined();
      expect(columns.newValue).toBeDefined();
      expect(columns.oldStatus).toBeDefined();
      expect(columns.newStatus).toBeDefined();
      expect(columns.changedBy).toBeDefined();
      expect(columns.changeSource).toBeDefined();
      expect(columns.changedAt).toBeDefined();
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @i18n-platform/database test -- src/schema/schema.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement translation_keys table**

Create `packages/database/src/schema/translation-keys.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { namespaces } from './namespaces';

/**
 * Translation keys table — the strings that need to be translated.
 *
 * Each key belongs to a project and optionally a namespace.
 * The `defaultValue` is the source-language string.
 */
export const translationKeys = pgTable(
  'translation_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    namespaceId: uuid('namespace_id').references(() => namespaces.id, {
      onDelete: 'set null',
    }),
    key: varchar('key', { length: 500 }).notNull(),
    defaultValue: text('default_value').notNull().default(''),
    description: text('description').notNull().default(''),
    maxLength: integer('max_length'),
    metadata: jsonb('metadata').notNull().default({}),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('translation_keys_project_key_idx').on(table.projectId, table.key),
    index('translation_keys_project_id_idx').on(table.projectId),
    index('translation_keys_namespace_id_idx').on(table.namespaceId),
  ],
);
```

- [ ] **Step 4: Implement translations table**

Create `packages/database/src/schema/translations.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { translationKeys } from './translation-keys';

/**
 * Translations table — the actual translated strings.
 *
 * One row per key per locale. Status tracks the translation lifecycle:
 * untranslated → machine_translated → needs_review → reviewed → approved → published
 */
export const translations = pgTable(
  'translations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    keyId: uuid('key_id')
      .notNull()
      .references(() => translationKeys.id, { onDelete: 'cascade' }),
    locale: varchar('locale', { length: 35 }).notNull(),
    value: text('value').notNull().default(''),
    status: varchar('status', { length: 30 }).notNull().default('untranslated'),
    translatedBy: varchar('translated_by', { length: 255 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('translations_key_locale_idx').on(table.keyId, table.locale),
    index('translations_locale_idx').on(table.locale),
    index('translations_status_idx').on(table.status),
  ],
);
```

- [ ] **Step 5: Implement translation_history table**

Create `packages/database/src/schema/translation-history.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { translations } from './translations';
import { users } from './users';

/**
 * Translation history table — audit trail of every translation change.
 *
 * Records old and new values, status transitions, who made the change,
 * and how it was made (dashboard, CLI, API, or machine translation).
 */
export const translationHistory = pgTable(
  'translation_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    translationId: uuid('translation_id')
      .notNull()
      .references(() => translations.id, { onDelete: 'cascade' }),
    oldValue: text('old_value').notNull().default(''),
    newValue: text('new_value').notNull().default(''),
    oldStatus: varchar('old_status', { length: 30 }).notNull().default(''),
    newStatus: varchar('new_status', { length: 30 }).notNull().default(''),
    changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
    changeSource: varchar('change_source', { length: 20 }).notNull().default('api'),
    changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('translation_history_translation_id_idx').on(table.translationId),
    index('translation_history_changed_at_idx').on(table.changedAt),
  ],
);
```

- [ ] **Step 6: Update schema barrel export**

Add to `packages/database/src/schema/index.ts`:

```typescript
export { translationKeys } from './translation-keys';
export { translations } from './translations';
export { translationHistory } from './translation-history';
```

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @i18n-platform/database test -- src/schema/schema.test.ts`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add packages/database/src/schema/
git commit -m "feat(database): add translation_keys, translations, translation_history tables"
```

---

### Task 13: Database Package — Schema (Reviews, Context, API Keys, MT, Audit)

**Files:**
- Create: `packages/database/src/schema/translation-reviews.ts`
- Create: `packages/database/src/schema/key-contexts.ts`
- Create: `packages/database/src/schema/api-keys.ts`
- Create: `packages/database/src/schema/mt-configs.ts`
- Create: `packages/database/src/schema/mt-quality-scores.ts`
- Create: `packages/database/src/schema/audit-log.ts`
- Modify: `packages/database/src/schema/index.ts`
- Modify: `packages/database/src/schema/schema.test.ts`

- [ ] **Step 1: Implement translation_reviews table**

Create `packages/database/src/schema/translation-reviews.ts`:

```typescript
import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { translations } from './translations';
import { users } from './users';

/**
 * Translation reviews table — records approval/rejection decisions.
 */
export const translationReviews = pgTable(
  'translation_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    translationId: uuid('translation_id')
      .notNull()
      .references(() => translations.id, { onDelete: 'cascade' }),
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 20 }).notNull(),
    comment: text('comment').notNull().default(''),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('translation_reviews_translation_id_idx').on(table.translationId),
    index('translation_reviews_reviewer_id_idx').on(table.reviewerId),
  ],
);
```

- [ ] **Step 2: Implement key_contexts table**

Create `packages/database/src/schema/key-contexts.ts`:

```typescript
import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { translationKeys } from './translation-keys';

/**
 * Key contexts table — screenshots and URLs attached to translation keys.
 *
 * Helps translators see where strings appear in the UI.
 */
export const keyContexts = pgTable(
  'key_contexts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    keyId: uuid('key_id')
      .notNull()
      .references(() => translationKeys.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(),
    value: text('value').notNull(),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('key_contexts_key_id_idx').on(table.keyId)],
);
```

- [ ] **Step 3: Implement api_keys table**

Create `packages/database/src/schema/api-keys.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

/**
 * API keys table — scoped authentication keys for SDK/CLI access.
 *
 * Keys are hashed — only the prefix is stored in plaintext for identification.
 */
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    keyHash: varchar('key_hash', { length: 255 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),
    scopes: jsonb('scopes').notNull(),
    environment: varchar('environment', { length: 20 }).notNull().default('development'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('api_keys_project_id_idx').on(table.projectId),
    index('api_keys_key_prefix_idx').on(table.keyPrefix),
  ],
);
```

- [ ] **Step 4: Implement mt_configs table**

Create `packages/database/src/schema/mt-configs.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  real,
  decimal,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { projects } from './projects';

/**
 * Machine translation configs table — per-project, per-locale-pair MT settings.
 */
export const mtConfigs = pgTable(
  'mt_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sourceLocale: varchar('source_locale', { length: 35 }).notNull(),
    targetLocale: varchar('target_locale', { length: 35 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    enabled: boolean('enabled').notNull().default(true),
    autoTranslate: boolean('auto_translate').notNull().default(false),
    autoApproveThreshold: real('auto_approve_threshold'),
    providerConfig: jsonb('provider_config').notNull().default({}),
    costBudgetMonthly: decimal('cost_budget_monthly', { precision: 10, scale: 2 }),
    costSpentMonthly: decimal('cost_spent_monthly', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('mt_configs_project_locales_provider_idx').on(
      table.projectId,
      table.sourceLocale,
      table.targetLocale,
      table.provider,
    ),
    index('mt_configs_project_id_idx').on(table.projectId),
  ],
);
```

- [ ] **Step 5: Implement mt_quality_scores table**

Create `packages/database/src/schema/mt-quality-scores.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  real,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { mtConfigs } from './mt-configs';

/**
 * MT quality scores table — tracks translation quality per provider per locale pair.
 *
 * Updated as translators review MT output. Used by smart routing to pick
 * the best provider for each language pair.
 */
export const mtQualityScores = pgTable(
  'mt_quality_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mtConfigId: uuid('mt_config_id')
      .notNull()
      .references(() => mtConfigs.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    localePair: varchar('locale_pair', { length: 75 }).notNull(),
    qualityScore: real('quality_score').notNull().default(0),
    totalTranslations: integer('total_translations').notNull().default(0),
    acceptedWithoutEdit: integer('accepted_without_edit').notNull().default(0),
    acceptedWithEdit: integer('accepted_with_edit').notNull().default(0),
    rejected: integer('rejected').notNull().default(0),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('mt_quality_scores_config_id_idx').on(table.mtConfigId),
    index('mt_quality_scores_locale_pair_idx').on(table.localePair),
  ],
);
```

- [ ] **Step 6: Implement audit_log table**

Create `packages/database/src/schema/audit-log.ts`:

```typescript
import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';
import { users } from './users';

/**
 * Audit log table — records every meaningful action in the platform.
 *
 * Used for compliance, debugging, and the dashboard audit log view.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id'),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: uuid('resource_id'),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_log_org_id_idx').on(table.orgId),
    index('audit_log_project_id_idx').on(table.projectId),
    index('audit_log_user_id_idx').on(table.userId),
    index('audit_log_created_at_idx').on(table.createdAt),
    index('audit_log_action_idx').on(table.action),
  ],
);
```

- [ ] **Step 7: Update schema barrel export**

Add to `packages/database/src/schema/index.ts`:

```typescript
export { translationReviews } from './translation-reviews';
export { keyContexts } from './key-contexts';
export { apiKeys } from './api-keys';
export { mtConfigs } from './mt-configs';
export { mtQualityScores } from './mt-quality-scores';
export { auditLog } from './audit-log';
```

- [ ] **Step 8: Add tests for new tables**

Add the imports and test blocks for `translationReviews`, `keyContexts`, `apiKeys`, `mtConfigs`, `mtQualityScores`, `auditLog` to `schema.test.ts` following the same pattern as previous tasks.

- [ ] **Step 9: Run all schema tests**

Run: `pnpm --filter @i18n-platform/database test`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add packages/database/src/schema/
git commit -m "feat(database): add reviews, contexts, api_keys, mt_configs, mt_quality_scores, audit_log tables"
```

---

### Task 14: Database Package — Relations & Seed

**Files:**
- Create: `packages/database/src/relations.ts`
- Create: `packages/database/src/seed.ts`
- Modify: `packages/database/src/index.ts`

- [ ] **Step 1: Create Drizzle relations**

Create `packages/database/src/relations.ts`:

```typescript
import { relations } from 'drizzle-orm';
import {
  organizations,
  users,
  orgMembers,
  projects,
  projectLocales,
  namespaces,
  translationKeys,
  translations,
  translationHistory,
  translationReviews,
  keyContexts,
  apiKeys,
  mtConfigs,
  mtQualityScores,
  auditLog,
} from './schema';

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(orgMembers),
  projects: many(projects),
  auditLogs: many(auditLog),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(orgMembers),
  reviews: many(translationReviews),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  locales: many(projectLocales),
  namespaces: many(namespaces),
  keys: many(translationKeys),
  apiKeys: many(apiKeys),
  mtConfigs: many(mtConfigs),
}));

export const projectLocalesRelations = relations(projectLocales, ({ one }) => ({
  project: one(projects, {
    fields: [projectLocales.projectId],
    references: [projects.id],
  }),
}));

export const namespacesRelations = relations(namespaces, ({ one, many }) => ({
  project: one(projects, {
    fields: [namespaces.projectId],
    references: [projects.id],
  }),
  keys: many(translationKeys),
}));

export const translationKeysRelations = relations(translationKeys, ({ one, many }) => ({
  project: one(projects, {
    fields: [translationKeys.projectId],
    references: [projects.id],
  }),
  namespace: one(namespaces, {
    fields: [translationKeys.namespaceId],
    references: [namespaces.id],
  }),
  translations: many(translations),
  contexts: many(keyContexts),
}));

export const translationsRelations = relations(translations, ({ one, many }) => ({
  key: one(translationKeys, {
    fields: [translations.keyId],
    references: [translationKeys.id],
  }),
  history: many(translationHistory),
  reviews: many(translationReviews),
}));

export const translationHistoryRelations = relations(translationHistory, ({ one }) => ({
  translation: one(translations, {
    fields: [translationHistory.translationId],
    references: [translations.id],
  }),
  changedByUser: one(users, {
    fields: [translationHistory.changedBy],
    references: [users.id],
  }),
}));

export const translationReviewsRelations = relations(translationReviews, ({ one }) => ({
  translation: one(translations, {
    fields: [translationReviews.translationId],
    references: [translations.id],
  }),
  reviewer: one(users, {
    fields: [translationReviews.reviewerId],
    references: [users.id],
  }),
}));

export const keyContextsRelations = relations(keyContexts, ({ one }) => ({
  key: one(translationKeys, {
    fields: [keyContexts.keyId],
    references: [translationKeys.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  project: one(projects, {
    fields: [apiKeys.projectId],
    references: [projects.id],
  }),
}));

export const mtConfigsRelations = relations(mtConfigs, ({ one, many }) => ({
  project: one(projects, {
    fields: [mtConfigs.projectId],
    references: [projects.id],
  }),
  qualityScores: many(mtQualityScores),
}));

export const mtQualityScoresRelations = relations(mtQualityScores, ({ one }) => ({
  mtConfig: one(mtConfigs, {
    fields: [mtQualityScores.mtConfigId],
    references: [mtConfigs.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLog.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 2: Create seed script**

Create `packages/database/src/seed.ts`:

```typescript
import { createConnection } from './connection';
import {
  organizations,
  users,
  orgMembers,
  projects,
  projectLocales,
  namespaces,
  translationKeys,
  translations,
} from './schema';

/**
 * Seed the database with sample data for local development.
 *
 * Run: `pnpm --filter @i18n-platform/database db:seed`
 */
async function seed() {
  const url = process.env.DATABASE_URL ?? 'postgresql://i18n:i18n@localhost:5432/i18n_platform';
  const db = createConnection({ url, logging: true });

  console.warn('Seeding database...');

  // Create org
  const [org] = await db
    .insert(organizations)
    .values({
      name: 'Demo Organization',
      slug: 'demo-org',
    })
    .returning();

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: '$2b$10$placeholder', // bcrypt hash placeholder
    })
    .returning();

  // Add user to org as owner
  await db.insert(orgMembers).values({
    orgId: org!.id,
    userId: user!.id,
    role: 'owner',
    permissions: { projects: {} },
  });

  // Create project
  const [project] = await db
    .insert(projects)
    .values({
      orgId: org!.id,
      name: 'Demo App',
      slug: 'demo-app',
      defaultLocale: 'en',
      deliveryMode: 'cdn',
    })
    .returning();

  // Add locales
  await db.insert(projectLocales).values([
    { projectId: project!.id, locale: 'en', coveragePercent: 100 },
    { projectId: project!.id, locale: 'fr', coveragePercent: 0 },
    { projectId: project!.id, locale: 'de', coveragePercent: 0 },
    { projectId: project!.id, locale: 'ja', coveragePercent: 0 },
  ]);

  // Create namespaces
  const [commonNs] = await db
    .insert(namespaces)
    .values([
      { projectId: project!.id, name: 'common', description: 'Common UI strings', sortOrder: 0 },
      {
        projectId: project!.id,
        name: 'auth',
        description: 'Authentication strings',
        sortOrder: 1,
      },
    ])
    .returning();

  // Create sample keys
  const keys = await db
    .insert(translationKeys)
    .values([
      {
        projectId: project!.id,
        namespaceId: commonNs!.id,
        key: 'common.greeting',
        defaultValue: 'Hello, {name}!',
        description: 'Greeting shown on the home page',
      },
      {
        projectId: project!.id,
        namespaceId: commonNs!.id,
        key: 'common.buttons.submit',
        defaultValue: 'Submit',
        description: 'Generic submit button label',
      },
      {
        projectId: project!.id,
        namespaceId: commonNs!.id,
        key: 'common.buttons.cancel',
        defaultValue: 'Cancel',
        description: 'Generic cancel button label',
      },
    ])
    .returning();

  // Create English translations (approved)
  for (const key of keys) {
    await db.insert(translations).values({
      keyId: key.id,
      locale: 'en',
      value: key.defaultValue,
      status: 'approved',
      translatedBy: user!.id,
    });
  }

  console.warn('Seeding complete!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
```

- [ ] **Step 3: Update database barrel export**

Replace `packages/database/src/index.ts` with:

```typescript
/**
 * @i18n-platform/database
 *
 * Drizzle ORM schema, connection factory, and database utilities
 * for the i18n automation platform.
 *
 * @packageDocumentation
 */

export { createConnection } from './connection';
export type { Database, ConnectionOptions } from './connection';

// Schema tables
export * from './schema';

// Relations
export * from './relations';
```

- [ ] **Step 4: Build database package**

Run: `pnpm --filter @i18n-platform/database build`
Expected: Clean build

- [ ] **Step 5: Commit**

```bash
git add packages/database/src/relations.ts packages/database/src/seed.ts packages/database/src/index.ts
git commit -m "feat(database): add Drizzle relations and seed script for local development"
```

---

### Task 15: Docker Compose & Environment Config

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: i18n
      POSTGRES_PASSWORD: i18n
      POSTGRES_DB: i18n_platform
    volumes:
      - .docker-data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U i18n"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - .docker-data/redis:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - .docker-data/minio:/data

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "8025:8025"
      - "1025:1025"
```

- [ ] **Step 2: Create `.env.example`**

```env
# ============================================================================
# i18n Platform — Environment Variables
# ============================================================================
# Copy this file to .env and fill in the values.
# All variables are documented below.
# ============================================================================

# ── Database ─────────────────────────────────────────────────────────────────
# PostgreSQL connection URL
DATABASE_URL=postgresql://i18n:i18n@localhost:5432/i18n_platform

# ── Redis ────────────────────────────────────────────────────────────────────
# Redis connection URL (used for caching, job queues, pub/sub)
REDIS_URL=redis://localhost:6379

# ── Auth ─────────────────────────────────────────────────────────────────────
# Secret for signing JWT tokens (generate with: openssl rand -base64 64)
JWT_SECRET=change-me-in-production
# JWT access token expiry
JWT_ACCESS_TOKEN_EXPIRY=15m
# JWT refresh token expiry
JWT_REFRESH_TOKEN_EXPIRY=7d

# OAuth — Google (optional)
OAUTH_GOOGLE_CLIENT_ID=
OAUTH_GOOGLE_CLIENT_SECRET=
OAUTH_GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# OAuth — GitHub (optional)
OAUTH_GITHUB_CLIENT_ID=
OAUTH_GITHUB_CLIENT_SECRET=
OAUTH_GITHUB_CALLBACK_URL=http://localhost:3000/api/v1/auth/github/callback

# ── Storage (for CDN publishing and screenshots) ────────────────────────────
# Adapter: s3 | r2 | gcs | local
STORAGE_ADAPTER=local
# Local storage path (when STORAGE_ADAPTER=local)
STORAGE_LOCAL_PATH=./.docker-data/storage

# S3 config (when STORAGE_ADAPTER=s3)
S3_BUCKET=i18n-translations
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true

# ── CDN ──────────────────────────────────────────────────────────────────────
# Base URL for published translation bundles
CDN_BASE_URL=http://localhost:9000/i18n-translations

# ── Machine Translation (all optional — configure per project in dashboard) ─
DEEPL_API_KEY=
GOOGLE_TRANSLATE_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AZURE_TRANSLATOR_KEY=
AZURE_TRANSLATOR_REGION=

# ── Email ────────────────────────────────────────────────────────────────────
# Adapter: resend | sendgrid | smtp
EMAIL_ADAPTER=smtp
# SMTP config (for local dev with Mailpit)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=noreply@i18n-platform.local

# Resend config (for production)
RESEND_API_KEY=

# ── API Server ───────────────────────────────────────────────────────────────
API_PORT=3000
API_HOST=0.0.0.0
# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:3001

# ── Dashboard ────────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
DASHBOARD_PORT=3001

# ── Logging ──────────────────────────────────────────────────────────────────
# Level: debug | info | warn | error
LOG_LEVEL=debug
```

- [ ] **Step 3: Verify Docker Compose starts**

Run: `cd "E:/Web dev/projects/i18n" && docker compose up -d`
Expected: All 4 services start (postgres, redis, minio, mailpit)

- [ ] **Step 4: Verify PostgreSQL is reachable**

Run: `docker compose exec postgres pg_isready -U i18n`
Expected: "accepting connections"

- [ ] **Step 5: Stop Docker**

Run: `docker compose down`

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add Docker Compose (postgres, redis, minio, mailpit) and .env.example"
```

---

### Task 16: CLAUDE.md & GitHub Actions CI

**Files:**
- Create: `CLAUDE.md`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
# i18n Platform — Project Conventions

## Architecture

Modular monorepo (pnpm + Turborepo) with independently publishable packages.

## Packages

- `@i18n-platform/core` — Shared types, interfaces, Zod schemas, errors. Zero runtime deps beyond Zod.
- `@i18n-platform/database` — Drizzle ORM schema, migrations, seed. Depends on `core`.

## Standards

- **TypeScript strict mode** everywhere
- **Adapter pattern** for all external integrations (format, storage, cache, MT, notification)
- **Conventional commits** (feat:, fix:, docs:, test:, refactor:, chore:)
- **No Co-Authored-By** in commit messages
- **JSDoc** on all exported functions, classes, interfaces, types
- **TDD** — write failing test first, then implement
- **Zod** for all input validation (API payloads, config files, CLI args)

## Testing

- Vitest for unit and integration tests
- Real database for integration tests (no mocking PostgreSQL)
- Contract tests for adapter implementations
- Fix the real bug, never just make the test pass

## Commands

```bash
pnpm build          # Build all packages
pnpm test           # Test all packages
pnpm lint           # Lint all packages
pnpm typecheck      # Type-check all packages
pnpm format         # Format all files
docker compose up -d # Start local dev services
```
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-and-typecheck:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm format:check

  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: i18n
          POSTGRES_PASSWORD: i18n
          POSTGRES_DB: i18n_platform
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U i18n"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=5s
          --health-timeout=5s
          --health-retries=5
    env:
      DATABASE_URL: postgresql://i18n:i18n@localhost:5432/i18n_platform
      REDIS_URL: redis://localhost:6379
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm test

  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md .github/
git commit -m "chore: add CLAUDE.md conventions and GitHub Actions CI workflow"
```

---

### Task 17: Final Verification

- [ ] **Step 1: Install all dependencies**

Run: `cd "E:/Web dev/projects/i18n" && pnpm install`

- [ ] **Step 2: Build all packages**

Run: `pnpm build`
Expected: Both `core` and `database` build successfully

- [ ] **Step 3: Run all tests**

Run: `pnpm test`
Expected: All tests pass across both packages

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck`
Expected: No type errors

- [ ] **Step 5: Verify git log**

Run: `git log --oneline`
Expected: Clean conventional commit history:
```
chore: add CLAUDE.md conventions and GitHub Actions CI workflow
chore: add Docker Compose (postgres, redis, minio, mailpit) and .env.example
feat(database): add Drizzle relations and seed script for local development
feat(database): add reviews, contexts, api_keys, mt_configs, mt_quality_scores, audit_log tables
feat(database): add translation_keys, translations, translation_history tables
feat(database): add projects, project_locales, namespaces tables
feat(database): add organizations, users, org_members tables
chore(database): scaffold database package with drizzle, postgres.js, tsup
feat(core): finalize core package public API — types, interfaces, schemas, errors
feat(core): add typed error hierarchy
feat(core): add Zod validation schemas for all API payloads and configs
feat(core): add all adapter interfaces
feat(core): add organization, project, user, api-key, mt, context, audit types
feat(core): add locale, translation, and delivery types with validation
chore(core): scaffold core package with tsup, vitest, zod
chore: scaffold monorepo with pnpm, turborepo, typescript, eslint, prettier
```

- [ ] **Step 6: Final commit (if any uncommitted changes)**

```bash
git status
# If clean: done. If changes: stage and commit with appropriate message.
```
