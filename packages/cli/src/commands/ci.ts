/**
 * `i18n ci` command — run translation coverage checks suitable for CI pipelines.
 *
 * Exits non-zero when coverage falls below the configured threshold or when
 * any required locales are not fully translated.
 *
 * @module commands/ci
 */

import type { Command } from 'commander';
import { loadProjectConfig } from '../config.js';
import { ApiClient } from '../api-client.js';
import { logger } from '../utils/logger.js';

/**
 * Shape of a locale coverage record returned by the API.
 * @internal
 */
interface LocaleCoverage {
  locale: string;
  total: number;
  translated: number;
  approved: number;
  coveragePercent: number;
}

/**
 * Registers the `ci` command with the Commander program.
 *
 * Intended to be run in CI pipelines. The command:
 *
 * 1. Fetches coverage data for all configured locales.
 * 2. Compares coverage against the threshold (default: `config.validation` or 100%).
 * 3. Logs a pass/fail summary.
 * 4. Exits with code `1` if any locale falls below the threshold.
 *
 * Options:
 * - `--config <path>`    — path to an explicit config file
 * - `--min-coverage <n>` — override the minimum coverage percent (0–100)
 * - `--locale <list>`    — comma-separated locales to check (default: all)
 * - `--json`             — output result as JSON (useful for CI log parsing)
 *
 * @param program - The root Commander {@link Command} instance
 */
export function registerCiCommand(program: Command): void {
  program
    .command('ci')
    .description('CI mode: exit non-zero if translation coverage is incomplete')
    .option('-c, --config <path>', 'Path to i18n config file')
    .option(
      '--min-coverage <n>',
      'Required minimum coverage percent (0–100)',
      parseFloat,
    )
    .option('--locale <locales>', 'Comma-separated locales to check')
    .option('--json', 'Output result as JSON', false)
    .action(
      async (options: {
        config?: string;
        minCoverage?: number;
        locale?: string;
        json: boolean;
      }) => {
        let config;
        try {
          config = await loadProjectConfig(options.config);
        } catch (err) {
          logger.error((err as Error).message);
          process.exit(1);
        }

        const threshold =
          options.minCoverage ??
          config.validation?.checkMissingPlaceholders
            ? 100
            : 80;

        const targetLocales = options.locale
          ? options.locale.split(',').map((l) => l.trim())
          : config.supportedLocales.filter((l) => l !== config.defaultLocale);

        const spinner = logger.spinner('Fetching coverage data from platform…');
        const client = new ApiClient(config.apiUrl, config.apiKey);

        try {
          const coverage = await client.get<LocaleCoverage[]>(
            `/projects/${config.projectId}/coverage`,
          );
          spinner.stop();

          const relevant = coverage.filter((c) => targetLocales.includes(c.locale));
          const failing = relevant.filter((c) => c.coveragePercent < threshold);

          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  threshold,
                  locales: relevant.map((c) => ({
                    locale: c.locale,
                    coveragePercent: c.coveragePercent,
                    total: c.total,
                    translated: c.translated,
                    approved: c.approved,
                    passed: c.coveragePercent >= threshold,
                  })),
                  passed: failing.length === 0,
                },
                null,
                2,
              ),
            );

            if (failing.length > 0) process.exit(1);
            return;
          }

          console.log(
            `\nCI coverage check (threshold: ${threshold}%) for project ${config.projectId}\n`,
          );

          let allPassed = true;
          for (const lc of relevant) {
            const passed = lc.coveragePercent >= threshold;
            if (passed) {
              logger.success(
                `${lc.locale.padEnd(10)} ${lc.coveragePercent.toFixed(1)}% (${lc.translated}/${lc.total})`,
              );
            } else {
              logger.error(
                `${lc.locale.padEnd(10)} ${lc.coveragePercent.toFixed(1)}% (${lc.translated}/${lc.total}) — BELOW THRESHOLD`,
              );
              allPassed = false;
            }
          }

          console.log('');

          if (!allPassed) {
            logger.error(
              `CI check FAILED — ${failing.length} locale(s) below ${threshold}% coverage.`,
            );
            process.exit(1);
          }

          logger.success('CI check PASSED — all locales meet the coverage threshold.');
        } catch (err) {
          spinner.fail('CI check failed');
          logger.error((err as Error).message);
          process.exit(1);
        }
      },
    );
}
