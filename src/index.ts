#!/usr/bin/env node

/**
 * @fileoverview Entry point for the check-my-deps CLI application.
 *
 * This module serves as the main entry point for the CLI tool and is responsible for:
 * - Setting up the command-line interface using Commander
 * - Registering available commands (export and update)
 * - Handling process signals for graceful termination
 * - Parsing command-line arguments
 * - Initializing the application with package information
 *
 * The CLI provides two main commands:
 * - export: Analyzes dependencies and exports reports in various formats (default command)
 * - update: Updates package.json dependencies based on specified rules
 */
import { Command } from 'commander';

import exportCommand from '@/commands/export-command';
import updateCommand from '@/commands/update-command';
import getPackageInfo from '@/utils/helpers/get-package-info';

process.on('SIGINT', () => process.exit(0));

process.on('SIGTERM', () => process.exit(0));

async function main() {
  const packageInfo = getPackageInfo();

  const program = new Command()
    .name('check-my-deps')
    .description('Analyze, export, and update npm dependencies in your project')
    .version(packageInfo.version || '0.0.1', '-v, --version', 'Display the version number');

  program.addCommand(exportCommand, { isDefault: true });

  program.addCommand(updateCommand);

  program.parse(process.argv);
}

void main();
