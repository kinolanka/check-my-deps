#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';

import NpmService from '@/services/npm-service';
import ExcelService from '@/services/excel-service';
import sanitizeFileName from '@/utils/helpers/sanitize-file-name';
import { Dependencies } from '@/utils/types';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
  const program = new Command();

  program
    .description(
      'Get the content of the package.json file and export dependencies to an Excel file'
    )
    .option(
      '-c, --cwd <cwd>',
      'the working directory. defaults to the current directory.',
      process.cwd()
    )
    .action(async (options) => {
      const packageJsonPath = path.resolve(options.cwd, 'package.json');
      try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);

        const dependencies: Dependencies = packageJson.dependencies || {};
        const devDependencies: Dependencies = packageJson.devDependencies || {};
        const peerDependencies: Dependencies = packageJson.peerDependencies || {};

        const npmService = new NpmService(options.cwd);
        const installedVersionsAndSources = npmService.getInstalledVersionsAndSources(
          dependencies,
          devDependencies,
          peerDependencies
        );

        const excelService = new ExcelService();
        excelService.addDependenciesToSheet(
          dependencies,
          'dependencies',
          installedVersionsAndSources,
          npmService
        );
        excelService.addDependenciesToSheet(
          devDependencies,
          'devdependencies',
          installedVersionsAndSources,
          npmService
        );
        excelService.addDependenciesToSheet(
          peerDependencies,
          'peerdependencies',
          installedVersionsAndSources,
          npmService
        );

        const packageName = sanitizeFileName(packageJson.name || 'package');
        const filePath = path.resolve(options.cwd, `${packageName}-deps-check.xlsx`);
        await excelService.saveToFile(filePath);

        console.log(chalk.green(`Excel file created at ${filePath}`));
      } catch (error) {
        console.error(chalk.red('An error occurred while processing the package.json file.'));
      }
    });

  program.parse(process.argv);
}

main();
