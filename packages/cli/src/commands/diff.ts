/**
 * `i18n diff` command — compare locally extracted keys against the platform.
 *
 * Shows keys present locally but missing from the platform (new), and keys
 * on the platform that are not found locally (deleted/unused).
 *
 * @module commands/diff
 */

import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { ReactExtractor, VanillaJsExtractor } from '@i18n-platform/core';
import { loadProjectConfig } from '../config.js';
import { ApiClient } from '../api-client.js';
import { logger } from '../utils/logger.js';

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

/**
 * Shape of a key record returned by the API.
 * @internal
 */
interface RemoteKey {
  key: string;
  namespace?: string;
}

/**
 * Registers the `diff` command with the Commander program.
 *
 * Compares the keys extracted from local source files against those currently
 * registered on the platform, and prints:
 *
 * - Keys that exist locally but are NOT on the platform (would be added by `push`)
 * - Keys that exist on the platform but are NOT found locally (potential candidates for deletion)
 *
 * Options:
 * - `--config <path>` — path to an explicit config file
 * - `--json`          — output as JSON
 *
 * @param program - The root Commander {@link Command} instance
 */
export function registerDiffCommand(program: Command): void {
  program
    .command('diff')
    .description('Show differences between local keys and the platform')
    .option('-c, --config <path>', 'Path to i18n config file')
    .option('--json', 'Output as JSON', false)
    .action(async (options: { config?: string; json: boolean }) => {
      let config;
      try {
        config = await loadProjectConfig(options.config);
      } catch (err) {
        logger.error((err as Error).message);
        process.exit(1);
      }

      const spinner = logger.spinner('Scanning local source files…');
      const cwd = process.cwd();
      const client = new ApiClient(config.apiUrl, config.apiKey);

      try {
        // Extract local keys
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

        const localKeys = new Set(
          [...reactResult.keys, ...vanillaResult.keys].map((k) => {
            const ns = k.namespace ?? config.source.defaultNamespace ?? 'default';
            return `${ns}:${k.key}`;
          }),
        );

        spinner.text = 'Fetching remote keys…';

        // Fetch remote keys
        const remoteKeys = await client.get<RemoteKey[]>(
          `/projects/${config.projectId}/keys`,
        );
        const remoteSet = new Set(
          remoteKeys.map((k) => {
            const ns = k.namespace ?? config.source.defaultNamespace ?? 'default';
            return `${ns}:${k.key}`;
          }),
        );

        spinner.stop();

        const added = [...localKeys].filter((k) => !remoteSet.has(k));
        const removed = [...remoteSet].filter((k) => !localKeys.has(k));

        if (options.json) {
          console.log(JSON.stringify({ added, removed }, null, 2));
          return;
        }

        if (added.length === 0 && removed.length === 0) {
          logger.success('No differences — local and remote keys are in sync.');
          return;
        }

        if (added.length > 0) {
          console.log(`\n+ ${added.length} key(s) to be added (run \`i18n push\`):`);
          for (const k of added) {
            console.log(`  + ${k}`);
          }
        }

        if (removed.length > 0) {
          console.log(`\n- ${removed.length} key(s) on remote not found locally:`);
          for (const k of removed) {
            console.log(`  - ${k}`);
          }
        }

        console.log('');
      } catch (err) {
        spinner.fail('Diff failed');
        logger.error((err as Error).message);
        process.exit(1);
      }
    });
}
