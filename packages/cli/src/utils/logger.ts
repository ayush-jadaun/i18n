/**
 * Logger utilities for the i18n CLI.
 *
 * Provides chalk-coloured console output and ora spinner helpers used
 * consistently across all commands.
 *
 * @module utils/logger
 */

import chalk from 'chalk';
import ora from 'ora';
import type { Ora } from 'ora';

/**
 * Centralised logger for CLI output.
 *
 * Each method writes a prefixed, coloured line to stdout/stderr so the user
 * can quickly distinguish informational messages from warnings and errors.
 */
export const logger = {
  /**
   * Writes an informational message to stdout.
   * @param msg - The message to display
   */
  info: (msg: string): void => {
    console.log(chalk.blue('ℹ'), msg);
  },

  /**
   * Writes a success message to stdout.
   * @param msg - The message to display
   */
  success: (msg: string): void => {
    console.log(chalk.green('✓'), msg);
  },

  /**
   * Writes a warning message to stdout.
   * @param msg - The message to display
   */
  warn: (msg: string): void => {
    console.log(chalk.yellow('⚠'), msg);
  },

  /**
   * Writes an error message to stderr.
   * @param msg - The message to display
   */
  error: (msg: string): void => {
    console.error(chalk.red('✗'), msg);
  },

  /**
   * Starts an ora spinner with the given label and returns the spinner instance
   * so the caller can stop or update it.
   *
   * @param msg - Text shown next to the spinner
   * @returns A started {@link Ora} spinner instance
   */
  spinner: (msg: string): Ora => ora(msg).start(),
};
