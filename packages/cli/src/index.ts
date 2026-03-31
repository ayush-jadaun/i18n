/**
 * i18n CLI entry point.
 *
 * Sets up the Commander program and registers all sub-commands.
 * This file is the `bin` entry point compiled to `dist/index.js`.
 *
 * @module index
 */

import { Command } from 'commander';
import { registerInitCommand } from './commands/init.js';
import { registerExtractCommand } from './commands/extract.js';
import { registerPushCommand } from './commands/push.js';
import { registerPullCommand } from './commands/pull.js';
import { registerSyncCommand } from './commands/sync.js';
import { registerValidateCommand } from './commands/validate.js';
import { registerCodegenCommand } from './commands/codegen.js';
import { registerStatusCommand } from './commands/status.js';
import { registerDiffCommand } from './commands/diff.js';
import { registerCiCommand } from './commands/ci.js';

/** Root Commander program. */
const program = new Command()
  .name('i18n')
  .version('0.1.0')
  .description('i18n Automation Platform CLI — extract, push, pull, sync, validate');

registerInitCommand(program);
registerExtractCommand(program);
registerPushCommand(program);
registerPullCommand(program);
registerSyncCommand(program);
registerValidateCommand(program);
registerCodegenCommand(program);
registerStatusCommand(program);
registerDiffCommand(program);
registerCiCommand(program);

program.parse();
