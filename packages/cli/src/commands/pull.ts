/**
 * `i18n pull` command — pull translations from the platform and write them to disk.
 *
 * @module commands/pull
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Command } from 'commander';
import {
  JsonFlatAdapter,
  JsonNestedAdapter,
  YamlAdapter,
  PoAdapter,
  XliffAdapter,
} from '@i18n-platform/core';
import type { IFormatAdapter, TranslationMap } from '@i18n-platform/core';
import { loadProjectConfig } from '../config.js';
import { ApiClient } from '../api-client.js';
import { logger } from '../utils/logger.js';

/**
 * Returns the appropriate format adapter based on a format identifier string.
 *
 * Supported identifiers: `json-flat`, `json-nested`, `yaml`, `po`, `xliff`.
 * Defaults to `json-flat` when unrecognised.
 *
 * @param format - Format identifier
 * @returns A matching {@link IFormatAdapter} instance
 * @internal
 */
function getFormatAdapter(format: string): IFormatAdapter {
  switch (format) {
    case 'json-nested': return new JsonNestedAdapter();
    case 'yaml':        return new YamlAdapter();
    case 'po':          return new PoAdapter();
    case 'xliff':       return new XliffAdapter();
    default:            return new JsonFlatAdapter();
  }
}

/**
 * Replaces `{{locale}}` and `{{namespace}}` tokens in a file pattern.
 *
 * @param pattern   - Template string such as `"{{locale}}/{{namespace}}.json"`
 * @param locale    - BCP-47 locale code
 * @param namespace - Namespace name
 * @returns Resolved file path segment
 * @internal
 */
function resolveFilePattern(
  pattern: string,
  locale: string,
  namespace: string,
): string {
  return pattern
    .replace(/\{\{locale\}\}/g, locale)
    .replace(/\{\{namespace\}\}/g, namespace);
}

/**
 * Shape of a translation bundle returned by the API.
 * @internal
 */
interface TranslationBundle {
  locale: string;
  namespace: string;
  translations: TranslationMap;
}

/**
 * Registers the `pull` command with the Commander program.
 *
 * Fetches translations for all (or specified) locales from the platform API
 * and writes them to the output directory defined in the config using the
 * configured file pattern.
 *
 * Options:
 * - `--config <path>`   — path to an explicit config file
 * - `--locale <list>`   — comma-separated locales to pull (default: all from config)
 * - `--format <format>` — output format: `json-flat` | `json-nested` | `yaml` | `po` | `xliff`
 *
 * @param program - The root Commander {@link Command} instance
 */
export function registerPullCommand(program: Command): void {
  program
    .command('pull')
    .description('Pull translations from the platform and write them to disk')
    .option('-c, --config <path>', 'Path to i18n config file')
    .option('--locale <locales>', 'Comma-separated locales to pull')
    .option(
      '--format <format>',
      'Output format: json-flat | json-nested | yaml | po | xliff',
    )
    .action(
      async (options: { config?: string; locale?: string; format?: string }) => {
        let config;
        try {
          config = await loadProjectConfig(options.config);
        } catch (err) {
          logger.error((err as Error).message);
          process.exit(1);
        }

        const locales = options.locale
          ? options.locale.split(',').map((l) => l.trim())
          : config.supportedLocales;

        const adapter = getFormatAdapter(options.format ?? 'json-flat');
        const client = new ApiClient(config.apiUrl, config.apiKey);
        const spinner = logger.spinner(
          `Pulling translations for ${locales.join(', ')}…`,
        );

        let written = 0;
        try {
          for (const locale of locales) {
            const bundles = await client.get<TranslationBundle[]>(
              `/projects/${config.projectId}/translations/${locale}`,
            );

            for (const bundle of bundles) {
              const relPath = resolveFilePattern(
                config.output.filePattern,
                bundle.locale,
                bundle.namespace,
              );
              const outPath = join(process.cwd(), config.output.path, relPath);
              const sortedMap: TranslationMap = config.output.sortKeys
                ? Object.fromEntries(
                    Object.entries(bundle.translations).sort(([a], [b]) =>
                      a.localeCompare(b),
                    ),
                  )
                : bundle.translations;

              const content = adapter.serialize(sortedMap, {
                pretty: true,
                sortKeys: config.output.sortKeys,
              });

              await mkdir(dirname(outPath), { recursive: true });
              await writeFile(outPath, content, 'utf-8');
              written++;
            }
          }

          spinner.succeed(
            `Pulled translations — ${written} file(s) written to ${config.output.path}`,
          );
        } catch (err) {
          spinner.fail('Failed to pull translations');
          logger.error((err as Error).message);
          process.exit(1);
        }
      },
    );
}
