/**
 * `i18n init` command — scaffold an `i18n.config.ts` in the current directory.
 *
 * @module commands/init
 */

import { writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import type { Command } from 'commander';
import { logger } from '../utils/logger.js';

/** Template config written to `i18n.config.ts` when running `i18n init`. */
const CONFIG_TEMPLATE = `import type { ProjectConfig } from '@i18n-platform/core';

/**
 * i18n-platform project configuration.
 *
 * Run \`i18n --help\` to see available commands.
 *
 * @see https://github.com/your-org/i18n-platform
 */
const config: ProjectConfig = {
  /** UUID of your project — copy from the dashboard */
  projectId: 'YOUR_PROJECT_UUID',

  /** Base URL of the i18n-platform API */
  apiUrl: 'https://api.i18n-platform.example.com',

  /** API key — generate one in the dashboard under Settings > API Keys */
  apiKey: process.env['I18N_API_KEY'] ?? '',

  /** BCP-47 source locale */
  defaultLocale: 'en',

  /** All target locales this project should produce translations for */
  supportedLocales: ['en', 'fr', 'de', 'es'],

  /** Namespace names to include (empty array = all namespaces) */
  namespaces: [],

  delivery: {
    /** 'api' | 'cdn' | 'bundled' */
    mode: 'bundled',
  },

  source: {
    /** Glob patterns of source files to scan for translation keys */
    include: ['src/**/*.{ts,tsx,js,jsx}'],
    /** Glob patterns to exclude */
    exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    /** Namespace assigned to keys that don't declare one */
    defaultNamespace: 'common',
  },

  output: {
    /** Directory where translated files are written */
    path: 'public/locales',
    /**
     * File naming template.
     * Available tokens: {{locale}}, {{namespace}}
     */
    filePattern: '{{locale}}/{{namespace}}.json',
    /** Sort keys alphabetically in output files */
    sortKeys: true,
  },

  validation: {
    checkMissingPlaceholders: true,
    checkExtraPlaceholders: false,
    checkLength: true,
    maxLengthMultiplier: 2.5,
  },
};

export default config;
`;

/**
 * Registers the `init` command with the Commander program.
 *
 * The command creates an `i18n.config.ts` template in the current working
 * directory.  It refuses to overwrite an existing file unless `--force` is
 * passed.
 *
 * @param program - The root Commander {@link Command} instance
 */
export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize i18n configuration — creates i18n.config.ts in the current directory')
    .option('-f, --force', 'Overwrite an existing config file', false)
    .action(async (options: { force: boolean }) => {
      const dest = join(process.cwd(), 'i18n.config.ts');

      if (!options.force) {
        try {
          await access(dest);
          logger.error(
            'i18n.config.ts already exists. Use --force to overwrite.',
          );
          process.exit(1);
        } catch {
          // File does not exist — safe to create.
        }
      }

      const spinner = logger.spinner('Creating i18n.config.ts…');
      try {
        await writeFile(dest, CONFIG_TEMPLATE, 'utf-8');
        spinner.succeed('Created i18n.config.ts');
        logger.info('Next steps:');
        logger.info('  1. Set your projectId and apiUrl in i18n.config.ts');
        logger.info('  2. Export I18N_API_KEY in your shell (or .env)');
        logger.info('  3. Run `i18n extract` to discover translation keys');
      } catch (err) {
        spinner.fail('Failed to create i18n.config.ts');
        logger.error((err as Error).message);
        process.exit(1);
      }
    });
}
