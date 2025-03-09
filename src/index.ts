#!/usr/bin/env node
import { Command } from 'commander';

import exportCommand from '@/commands/export-command';
import updateCommand from '@/commands/update-command';
import getPackageInfo from '@/utils/helpers/get-package-info';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
  const packageInfo = await getPackageInfo();

  const program = new Command()
    .name('check-my-deps')
    .description('Analyze, export, and update npm dependencies in your project')
    .version(packageInfo.version || '0.0.1', '-v, --version', 'Display the version number');

  program.addCommand(exportCommand, { isDefault: true });
  program.addCommand(updateCommand);

  program.parse(process.argv);
}

main();
