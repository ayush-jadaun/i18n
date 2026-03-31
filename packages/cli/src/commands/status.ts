/**
 * `i18n status` command — display translation coverage across all locales.
 *
 * @module commands/status
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
 * Renders a simple ASCII progress bar.
 *
 * @param percent - Value from 0 to 100
 * @param width   - Bar width in characters (default 20)
 * @returns A string like `[████████░░░░░░░░░░░░] 40%`
 * @internal
 */
function progressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percent.toFixed(1)}%`;
}

/**
 * Registers the `status` command with the Commander program.
 *
 * Fetches translation coverage data from the API and renders a table showing
 * total keys, translated count, approved count, and coverage percentage for
 * each locale.
 *
 * Options:
 * - `--config <path>` — path to an explicit config file
 * - `--json`          — output as JSON
 *
 * @param program - The root Commander {@link Command} instance
 */
export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show translation coverage status for all locales')
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

      const spinner = logger.spinner('Fetching coverage data…');
      const client = new ApiClient(config.apiUrl, config.apiKey);

      try {
        const coverage = await client.get<LocaleCoverage[]>(
          `/projects/${config.projectId}/coverage`,
        );

        spinner.stop();

        if (options.json) {
          console.log(JSON.stringify(coverage, null, 2));
          return;
        }

        console.log(`\nProject: ${config.projectId}`);
        console.log(`Default locale: ${config.defaultLocale}\n`);

        const colLocale = 12;
        const colTotal = 8;
        const colTrans = 12;
        const colApproved = 10;

        const header =
          'Locale'.padEnd(colLocale) +
          'Total'.padStart(colTotal) +
          'Translated'.padStart(colTrans) +
          'Approved'.padStart(colApproved) +
          '  Coverage';
        console.log(header);
        console.log('─'.repeat(header.length + 6));

        for (const lc of coverage) {
          const row =
            lc.locale.padEnd(colLocale) +
            String(lc.total).padStart(colTotal) +
            String(lc.translated).padStart(colTrans) +
            String(lc.approved).padStart(colApproved) +
            '  ' +
            progressBar(lc.coveragePercent);
          console.log(row);
        }

        console.log('');
      } catch (err) {
        spinner.fail('Failed to fetch status');
        logger.error((err as Error).message);
        process.exit(1);
      }
    });
}
