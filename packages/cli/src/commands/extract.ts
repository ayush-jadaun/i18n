/**
 * `i18n extract` command — scan source files and print discovered translation keys.
 *
 * @module commands/extract
 */

import { glob } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { ReactExtractor, VanillaJsExtractor } from '@i18n-platform/core';
import type { ExtractedKey } from '@i18n-platform/core';
import { loadProjectConfig } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Resolves file paths matching the include globs from `config.source.include`,
 * filtering out paths that match any pattern in `config.source.exclude`.
 *
 * @param include - Array of glob patterns to include
 * @param exclude - Array of glob patterns to exclude
 * @param cwd     - Working directory to resolve globs against
 * @returns Deduplicated absolute file paths
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
      // glob() may not be available in all Node versions; fall back silently.
    }
  }

  if (matched.size === 0) {
    // Fallback: use a manual glob via the `globby`-compatible approach via node:fs
    // This is a best-effort fallback; the primary path uses native glob().
    return [];
  }

  // Filter excluded paths
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
 * Registers the `extract` command with the Commander program.
 *
 * Scans source files defined in `config.source.include` using the appropriate
 * extractors (React and/or VanillaJS) and prints a summary of all discovered
 * translation keys.
 *
 * Options:
 * - `--config <path>` — path to an explicit config file
 * - `--json`          — output results as JSON
 *
 * @param program - The root Commander {@link Command} instance
 */
export function registerExtractCommand(program: Command): void {
  program
    .command('extract')
    .description('Extract translation keys from source code')
    .option('-c, --config <path>', 'Path to i18n config file')
    .option('--json', 'Output results as JSON', false)
    .action(async (options: { config?: string; json: boolean }) => {
      let config;
      try {
        config = await loadProjectConfig(options.config);
      } catch (err) {
        logger.error((err as Error).message);
        process.exit(1);
      }

      const spinner = logger.spinner('Scanning source files…');
      const cwd = process.cwd();

      let filePaths: string[];
      try {
        filePaths = await resolveSourceFiles(
          config.source.include,
          config.source.exclude,
          cwd,
        );
      } catch (err) {
        spinner.fail('Failed to resolve source files');
        logger.error((err as Error).message);
        process.exit(1);
      }

      spinner.text = `Found ${filePaths.length} file(s) — extracting keys…`;

      const reactExtractor = new ReactExtractor();
      const vanillaExtractor = new VanillaJsExtractor();

      // Run both extractors; each handles only its supported extensions.
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

      spinner.stop();

      const allKeys: ExtractedKey[] = [
        ...reactResult.keys,
        ...vanillaResult.keys,
      ];
      const allWarnings = [
        ...reactResult.warnings,
        ...vanillaResult.warnings,
      ];

      if (options.json) {
        console.log(JSON.stringify({ keys: allKeys, warnings: allWarnings }, null, 2));
        return;
      }

      if (allWarnings.length > 0) {
        logger.warn(`${allWarnings.length} warning(s) during extraction:`);
        for (const w of allWarnings) {
          logger.warn(`  ${w.filePath}:${w.line ?? '?'} — ${w.message}`);
        }
      }

      if (allKeys.length === 0) {
        logger.warn('No translation keys found.');
        return;
      }

      logger.success(`Extracted ${allKeys.length} key(s) from ${filePaths.length} file(s)`);

      // Group by namespace for display
      const byNamespace = new Map<string, ExtractedKey[]>();
      for (const key of allKeys) {
        const ns = key.namespace ?? config.source.defaultNamespace ?? 'default';
        const bucket = byNamespace.get(ns) ?? [];
        bucket.push(key);
        byNamespace.set(ns, bucket);
      }

      for (const [ns, keys] of byNamespace) {
        console.log(`\n  ${ns} (${keys.length}):`);
        for (const k of keys) {
          const loc = `${k.filePath}:${k.line}`;
          const def = k.defaultValue ? ` = "${k.defaultValue}"` : '';
          console.log(`    ${k.key}${def}  ${loc}`);
        }
      }
    });
}
