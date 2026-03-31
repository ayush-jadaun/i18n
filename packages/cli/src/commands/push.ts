/**
 * `i18n push` command — extract keys from source and push them to the platform.
 *
 * @module commands/push
 */

import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { ReactExtractor, VanillaJsExtractor } from '@i18n-platform/core';
import type { ExtractedKey } from '@i18n-platform/core';
import { loadProjectConfig } from '../config.js';
import { ApiClient } from '../api-client.js';
import { logger } from '../utils/logger.js';

/**
 * Resolves file paths matching the include/exclude globs.
 * @internal
 */
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
    } catch {
      // ignore
    }
  }

  const excluded = new Set<string>();
  for (const pattern of exclude) {
    try {
      for await (const file of glob(pattern, { cwd })) {
        excluded.add(resolve(cwd, file));
      }
    } catch {
      // ignore
    }
  }

  return [...matched].filter((f) => !excluded.has(f));
}

/**
 * Payload shape for the POST /projects/:id/keys endpoint.
 * @internal
 */
interface PushKeysPayload {
  keys: Array<{
    key: string;
    defaultValue?: string;
    namespace?: string;
  }>;
}

/**
 * Registers the `push` command with the Commander program.
 *
 * Extracts translation keys from source files and POSTs them to the platform
 * API at `/projects/:projectId/keys`.  Duplicate keys are upserted server-side.
 *
 * Options:
 * - `--config <path>` — path to an explicit config file
 * - `--dry-run`       — print keys without sending to the API
 *
 * @param program - The root Commander {@link Command} instance
 */
export function registerPushCommand(program: Command): void {
  program
    .command('push')
    .description('Push translation keys to the platform')
    .option('-c, --config <path>', 'Path to i18n config file')
    .option('--dry-run', 'Print keys without pushing to the API', false)
    .action(async (options: { config?: string; dryRun: boolean }) => {
      let config;
      try {
        config = await loadProjectConfig(options.config);
      } catch (err) {
        logger.error((err as Error).message);
        process.exit(1);
      }

      const spinner = logger.spinner('Scanning source files…');
      const cwd = process.cwd();

      const filePaths = await resolveSourceFiles(
        config.source.include,
        config.source.exclude,
        cwd,
      );

      spinner.text = `Extracting keys from ${filePaths.length} file(s)…`;

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

      if (allKeys.length === 0) {
        spinner.warn('No translation keys found — nothing to push.');
        return;
      }

      if (options.dryRun) {
        spinner.stop();
        logger.info(`Dry run — ${allKeys.length} key(s) would be pushed:`);
        for (const k of allKeys) {
          const ns = k.namespace ?? config.source.defaultNamespace ?? 'default';
          logger.info(`  [${ns}] ${k.key}`);
        }
        return;
      }

      spinner.text = `Pushing ${allKeys.length} key(s) to the platform…`;

      const payload: PushKeysPayload = {
        keys: allKeys.map((k) => ({
          key: k.key,
          ...(k.defaultValue !== undefined ? { defaultValue: k.defaultValue } : {}),
          namespace:
            k.namespace ?? config.source.defaultNamespace ?? undefined,
        })),
      };

      try {
        const client = new ApiClient(config.apiUrl, config.apiKey);
        await client.post(`/projects/${config.projectId}/keys`, payload);
        spinner.succeed(`Pushed ${allKeys.length} key(s) to project ${config.projectId}`);
      } catch (err) {
        spinner.fail('Failed to push keys');
        logger.error((err as Error).message);
        process.exit(1);
      }
    });
}
