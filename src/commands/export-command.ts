import { Command } from 'commander';

import NpmService from '@/services/npm-service';
import ExcelService from '@/services/excel-service';
import OutputService from '@/services/output-service';
import PackageFileService from '@/services/package-file-service';
import ServiceCtx from '@/services/service-ctx';

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

    try {
      const ctx = new ServiceCtx({ cwd: options.cwd, outputService });

      const packageFileService = new PackageFileService(ctx);

      // const dependencies: Dependencies = packageFileService.getDeps('dependencies') || {};
      // const devDependencies: Dependencies = packageFileService.getDeps('devDependencies') || {};
      // const peerDependencies: Dependencies = packageFileService.getDeps('peerDependencies') || {};

      const npmService = new NpmService(packageFileService, ctx);

      npmService.init();

      const exportData = npmService.getList();

      // const installedVersionsAndSources = npmService.getInstalledVersionsAndSources(
      //   dependencies,
      //   devDependencies,
      //   peerDependencies
      // );

      // excelService.addDependenciesToSheet(
      //   dependencies,
      //   'dependencies',
      //   installedVersionsAndSources,
      //   npmService
      // );
      // excelService.addDependenciesToSheet(
      //   devDependencies,
      //   'devdependencies',
      //   installedVersionsAndSources,
      //   npmService
      // );
      // excelService.addDependenciesToSheet(
      //   peerDependencies,
      //   'peerdependencies',
      //   installedVersionsAndSources,
      //   npmService
      // );

      const excelService = new ExcelService(exportData, ctx);

      const filePath = packageFileService.getExportFilePath();

      await excelService.saveToFile(filePath);
    } catch (error) {
      outputService.error(error as Error);
    }
  });

export default exportCommand;
