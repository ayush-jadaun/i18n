/**
 * `i18n validate` command — check translation completeness and placeholder integrity.
 *
 * @module commands/validate
 */

import type { Command } from 'commander';
import type { TranslationMap } from '@i18n-platform/core';
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
 * Shape of a translation bundle used for placeholder validation.
 * @internal
 */
interface TranslationBundle {
  locale: string;
  namespace: string;
  translations: TranslationMap;
}

/**
 * Extracts all `{{placeholder}}` tokens from a string.
 * @internal
 */
function extractPlaceholders(value: string): Set<string> {
  const result = new Set<string>();
  const re = /\{\{([^}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    if (m[1]) result.add(m[1]);
  }
  return result;
}

/**
 * Validation issue describing a problem with a specific translation.
 * @internal
 */
interface ValidationIssue {
  locale: string;
  namespace: string;
  key: string;
  issue: string;
}

/**
 * Registers the `validate` command with the Commander program.
 *
 * Checks:
 * 1. Translation coverage against the minimum threshold in the config.
 * 2. Missing/extra placeholders relative to the source locale.
 * 3. String length violations when `checkLength` is enabled.
 *
 * Options:
 * - `--config <path>`   — path to an explicit config file
 * - `--locale <list>`   — comma-separated locales to validate (default: all)
 * - `--min-coverage <n>` — override minimum coverage percent
 *
 * Exits with code 1 if any validation checks fail.
 *
 * @param program - The root Commander {@link Command} instance
 */
export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate translation completeness and placeholder integrity')
    .option('-c, --config <path>', 'Path to i18n config file')
    .option('--locale <locales>', 'Comma-separated locales to validate')
    .option('--min-coverage <n>', 'Minimum coverage percent required (0–100)', parseFloat)
    .action(
      async (options: {
        config?: string;
        locale?: string;
        minCoverage?: number;
      }) => {
        let config;
        try {
          config = await loadProjectConfig(options.config);
        } catch (err) {
          logger.error((err as Error).message);
          process.exit(1);
        }

        const locales = options.locale
          ? options.locale.split(',').map((l) => l.trim())
          : config.supportedLocales.filter((l) => l !== config.defaultLocale);

        const minCoverage =
          options.minCoverage ??
          config.validation?.checkMissingPlaceholders
            ? 100
            : 80;

        const client = new ApiClient(config.apiUrl, config.apiKey);
        const spinner = logger.spinner('Fetching coverage data…');

        let failed = false;
        const issues: ValidationIssue[] = [];

        try {
          // ── Coverage check ────────────────────────────────────────────────
          const coverage = await client.get<LocaleCoverage[]>(
            `/projects/${config.projectId}/coverage`,
          );

          spinner.stop();

          for (const lc of coverage.filter((c) => locales.includes(c.locale))) {
            const threshold = minCoverage ?? 100;
            if (lc.coveragePercent < threshold) {
              logger.warn(
                `${lc.locale}: coverage ${lc.coveragePercent.toFixed(1)}% < required ${threshold}%`,
              );
              failed = true;
            } else {
              logger.success(
                `${lc.locale}: coverage ${lc.coveragePercent.toFixed(1)}% ✓`,
              );
            }
          }

          // ── Placeholder & length checks ───────────────────────────────────
          if (
            config.validation?.checkMissingPlaceholders ||
            config.validation?.checkExtraPlaceholders ||
            config.validation?.checkLength
          ) {
            const srcSpinner = logger.spinner('Fetching source strings…');
            const srcBundles = await client.get<TranslationBundle[]>(
              `/projects/${config.projectId}/translations/${config.defaultLocale}`,
            );
            srcSpinner.stop();

            const srcIndex = new Map<string, string>();
            for (const bundle of srcBundles) {
              for (const [key, value] of Object.entries(bundle.translations)) {
                srcIndex.set(`${bundle.namespace}:${key}`, value);
              }
            }

            for (const locale of locales) {
              const trgSpinner = logger.spinner(
                `Validating placeholders for ${locale}…`,
              );
              const bundles = await client.get<TranslationBundle[]>(
                `/projects/${config.projectId}/translations/${locale}`,
              );
              trgSpinner.stop();

              for (const bundle of bundles) {
                for (const [key, translated] of Object.entries(bundle.translations)) {
                  const srcKey = `${bundle.namespace}:${key}`;
                  const source = srcIndex.get(srcKey);
                  if (source === undefined) continue;

                  const srcPH = extractPlaceholders(source);
                  const trgPH = extractPlaceholders(translated);

                  if (config.validation?.checkMissingPlaceholders) {
                    for (const ph of srcPH) {
                      if (!trgPH.has(ph)) {
                        issues.push({
                          locale,
                          namespace: bundle.namespace,
                          key,
                          issue: `Missing placeholder: {{${ph}}}`,
                        });
                        failed = true;
                      }
                    }
                  }

                  if (config.validation?.checkExtraPlaceholders) {
                    for (const ph of trgPH) {
                      if (!srcPH.has(ph)) {
                        issues.push({
                          locale,
                          namespace: bundle.namespace,
                          key,
                          issue: `Extra placeholder: {{${ph}}}`,
                        });
                        failed = true;
                      }
                    }
                  }

                  if (config.validation?.checkLength) {
                    const multiplier =
                      config.validation.maxLengthMultiplier ?? 2.5;
                    if (translated.length > source.length * multiplier) {
                      issues.push({
                        locale,
                        namespace: bundle.namespace,
                        key,
                        issue: `Translation too long: ${translated.length} > ${Math.round(source.length * multiplier)} chars`,
                      });
                      // Length issues are warnings, not hard failures
                    }
                  }
                }
              }
            }
          }

          if (issues.length > 0) {
            logger.warn('\nValidation issues:');
            for (const iss of issues) {
              logger.warn(
                `  [${iss.locale}] ${iss.namespace}:${iss.key} — ${iss.issue}`,
              );
            }
          }

          if (failed) {
            logger.error('Validation failed — see issues above.');
            process.exit(1);
          } else {
            logger.success('All validation checks passed.');
          }
        } catch (err) {
          spinner.fail('Validation failed');
          logger.error((err as Error).message);
          process.exit(1);
        }
      },
    );
}
