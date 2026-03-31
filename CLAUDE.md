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
