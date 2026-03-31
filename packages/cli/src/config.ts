/**
 * Config loader for the i18n CLI.
 *
 * Discovers and parses the project's `i18n.config.ts` (or equivalent) using
 * cosmiconfig, then validates the result against {@link ProjectConfigSchema}.
 *
 * @module config
 */

import { cosmiconfig } from 'cosmiconfig';
import { ProjectConfigSchema } from '@i18n-platform/core';
import type { ProjectConfig } from '@i18n-platform/core';

// ProjectConfigSchema.parse() returns a Zod-inferred type whose delivery.mode
// is typed as `string` (due to the loose enum cast in core).  We cast the
// result to the hand-authored ProjectConfig interface which has the proper
// DeliveryMode literal union.
type ParsedConfig = ReturnType<typeof ProjectConfigSchema.parse>;

/**
 * Resolves and validates the project configuration.
 *
 * Searches for an i18n configuration file starting from the current working
 * directory, walking up the directory tree. If `configPath` is provided, that
 * exact file is loaded instead.
 *
 * Supported file names (in search order):
 * - `i18n.config.ts`
 * - `i18n.config.js`
 * - `i18n.config.json`
 * - `.i18nrc`
 * - `.i18nrc.json`
 *
 * @param configPath - Optional absolute path to a specific config file
 * @returns The validated {@link ProjectConfig} object
 * @throws {Error} When no config file is found or the config fails validation
 *
 * @example
 * ```ts
 * const config = await loadProjectConfig();
 * console.log(config.projectId);
 * ```
 */
export async function loadProjectConfig(configPath?: string): Promise<ParsedConfig & ProjectConfig> {
  const explorer = cosmiconfig('i18n', {
    searchPlaces: [
      'i18n.config.ts',
      'i18n.config.js',
      'i18n.config.json',
      '.i18nrc',
      '.i18nrc.json',
    ],
  });

  const result = configPath
    ? await explorer.load(configPath)
    : await explorer.search();

  if (!result || result.isEmpty) {
    throw new Error('No i18n config found. Run `i18n init` to create one.');
  }

  return ProjectConfigSchema.parse(result.config) as ParsedConfig & ProjectConfig;
}
