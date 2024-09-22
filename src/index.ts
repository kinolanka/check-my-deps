#!/usr/bin/env node
import { Command } from 'commander';

import exportCommand from '@/commands/export-command';
import getPackageInfo from '@/utils/helpers/get-package-info';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
  const packageInfo = await getPackageInfo();

  const program = new Command()
    .name('check-my-deps')
    .description('Easily manage and monitor project dependencies')
    .version(packageInfo.version || '0.0.1', '-v, --version', 'display the version number');

  program.addCommand(exportCommand, { isDefault: true });

  program.parse(process.argv);
}

main();
