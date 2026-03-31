/**
 * `i18n sync` command — push keys then pull translations in one step.
 *
 * @module commands/sync
 */

import type { Command } from 'commander';
import { glob } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import {
  ReactExtractor,
  VanillaJsExtractor,
  JsonFlatAdapter,
  JsonNestedAdapter,
  YamlAdapter,
  PoAdapter,
  XliffAdapter,
} from '@i18n-platform/core';
import type { ExtractedKey, IFormatAdapter, TranslationMap } from '@i18n-platform/core';
import { loadProjectConfig } from '../config.js';
import { ApiClient } from '../api-client.js';
import { logger } from '../utils/logger.js';

/** @internal */
function getFormatAdapter(format: string): IFormatAdapter {
  switch (format) {
    case 'json-nested': return new JsonNestedAdapter();
    case 'yaml':        return new YamlAdapter();
    case 'po':          return new PoAdapter();
    case 'xliff':       return new XliffAdapter();
    default:            return new JsonFlatAdapter();
  }
}

/** @internal */
async function resolveSourceFiles(
  include: string[],
  exclude: string[] = [],
  cwd: string,
): Promise<string[]> {
  const matched = new Set<string>();
  for (const pattern of include) {
    try {
      for await (const file of glob(pattern, { cwd })) {
        matched.add(resolve(cwd, file));
      }
    } catch { /* ignore */ }
  }
  const excluded = new Set<string>();
  for (const pattern of exclude) {
    try {
      for await (const file of glob(pattern, { cwd })) {
        excluded.add(resolve(cwd, file));
      }
    } catch { /* ignore */ }
  }
  return [...matched].filter((f) => !excluded.has(f));
}

/** @internal */
interface TranslationBundle {
  locale: string;
  namespace: string;
  translations: TranslationMap;
}

/**
 * Registers the `sync` command with the Commander program.
 *
 * Combines `push` (extract + upload keys) and `pull` (download translations)
 * into a single atomic CLI invocation.
 *
 * Options:
 * - `--config <path>`   — path to an explicit config file
 * - `--format <format>` — output format for pulled files
 *
 * @param program - The root Commander {@link Command} instance
 */
export function registerSyncCommand(program: Command): void {
  program
    .command('sync')
    .description('Push translation keys to the platform, then pull translations (push + pull)')
    .option('-c, --config <path>', 'Path to i18n config file')
    .option(
      '--format <format>',
      'Output format for pulled files: json-flat | json-nested | yaml | po | xliff',
    )
    .action(async (options: { config?: string; format?: string }) => {
      let config;
      try {
        config = await loadProjectConfig(options.config);
      } catch (err) {
        logger.error((err as Error).message);
        process.exit(1);
      }

      const cwd = process.cwd();
      const client = new ApiClient(config.apiUrl, config.apiKey);

      // ── Step 1: Extract + Push ──────────────────────────────────────────────
      const pushSpinner = logger.spinner('Step 1/2 — Extracting and pushing keys…');

      const filePaths = await resolveSourceFiles(
        config.source.include,
        config.source.exclude,
        cwd,
      );

      const reactExtractor = new ReactExtractor();
      const vanillaExtractor = new VanillaJsExtractor();
      const reactFiles = filePaths.filter((f) =>
        reactExtractor.supportedFileTypes.some((ext) => f.endsWith(ext)),
      );
      const vanillaFiles = filePaths.filter((f) =>
        vanillaExtractor.supportedFileTypes.some((ext) => f.endsWith(ext)) &&
        !reactFiles.includes(f),
      );

      const [reactResult, vanillaResult] = await Promise.all([
        reactExtractor.extract(reactFiles),
        vanillaExtractor.extract(vanillaFiles),
      ]);

      const allKeys: ExtractedKey[] = [...reactResult.keys, ...vanillaResult.keys];

      if (allKeys.length > 0) {
        try {
          await client.post(`/projects/${config.projectId}/keys`, {
            keys: allKeys.map((k) => ({
              key: k.key,
              ...(k.defaultValue !== undefined ? { defaultValue: k.defaultValue } : {}),
              namespace: k.namespace ?? config.source.defaultNamespace ?? undefined,
            })),
          });
          pushSpinner.succeed(`Pushed ${allKeys.length} key(s)`);
        } catch (err) {
          pushSpinner.fail('Failed to push keys');
          logger.error((err as Error).message);
          process.exit(1);
        }
      } else {
        pushSpinner.warn('No keys found — skipping push');
      }

      // ── Step 2: Pull ────────────────────────────────────────────────────────
      const pullSpinner = logger.spinner('Step 2/2 — Pulling translations…');
      const adapter = getFormatAdapter(options.format ?? 'json-flat');
      let written = 0;

      try {
        for (const locale of config.supportedLocales) {
          const bundles = await client.get<TranslationBundle[]>(
            `/projects/${config.projectId}/translations/${locale}`,
          );

          for (const bundle of bundles) {
            const relPath = config.output.filePattern
              .replace(/\{\{locale\}\}/g, bundle.locale)
              .replace(/\{\{namespace\}\}/g, bundle.namespace);
            const outPath = join(cwd, config.output.path, relPath);
            const content = adapter.serialize(bundle.translations, {
              pretty: true,
              sortKeys: config.output.sortKeys,
            });
            await mkdir(dirname(outPath), { recursive: true });
            await writeFile(outPath, content, 'utf-8');
            written++;
          }
        }
        pullSpinner.succeed(
          `Pulled translations — ${written} file(s) written to ${config.output.path}`,
        );
      } catch (err) {
        pullSpinner.fail('Failed to pull translations');
        logger.error((err as Error).message);
        process.exit(1);
      }

      logger.success('Sync complete');
    });
}
