import fs from 'fs';
import path from 'path';
import { Command } from 'commander';

import NpmService from '@/services/npm-service';
import ExcelService from '@/services/excel-service';
import sanitizeFileName from '@/utils/helpers/sanitize-file-name';
import { Dependencies } from '@/utils/types';
import OutputService from '@/services/output-service';

const exportCommand = new Command()
  .name('export')
  .description('Get the content of the package.json file and export dependencies to an Excel file')
  .option(
    '-c, --cwd <cwd>',
    'the working directory. defaults to the current directory.',
    process.cwd()
  )
  .action(async (options) => {
    const outputService = new OutputService();

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

      outputService.msg(`Excel file created at ${filePath}`);
    } catch (error) {
      outputService.error((error as Error).message);
    }
  });

export default exportCommand;
