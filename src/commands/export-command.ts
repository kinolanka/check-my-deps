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

      const packages = packageFileService.getPackages();

      const npmService = new NpmService(packages, ctx);

      const exportList = npmService.getList();

      const excelService = new ExcelService(exportList, ctx);

      const filePath = packageFileService.getExportFilePath();

      await excelService.saveToFile(filePath);
    } catch (error) {
      outputService.error(error as Error);
    }
  });

export default exportCommand;
