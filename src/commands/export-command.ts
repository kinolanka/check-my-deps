import { Command } from 'commander';

import NpmService from '@/services/npm-service';
import ExcelService from '@/services/excel-service';
import JsonService from '@/services/json-service';
import OutputService from '@/services/output-service';
import PackageFileService from '@/services/package-file-service';
import ServiceCtx from '@/services/service-ctx';
import SummaryService from '@/services/summary-service';
import { ExportFormat } from '@/utils/types';

const exportCommand = new Command()
  .name('export')
  .description('Get the content of the package.json file and export dependencies to an Excel file')
  .option(
    '-c, --cwd <cwd>',
    'the working directory. defaults to the current directory.',
    process.cwd()
  )
  .option(
    '-o, --output-dir <outputDir>',
    'the directory where the export file will be saved. defaults to the current directory.',
    process.cwd()
  )
  .option('-s, --silent', 'prevent any output to the terminal', false)
  .option(
    '-f, --force-overwrite',
    'overwrite existing export files instead of creating unique filenames',
    false
  )
  .option(
    '--format <format>',
    'the format of the export file (excel or json)',
    'excel'
  )
  .action(async (options) => {
    const outputService = new OutputService(options.silent);
    outputService.startLoading('Analyzing dependencies...');

    try {
      outputService.updateLoadingText('Reading package.json...');
      const ctx = new ServiceCtx({
        cwd: options.cwd,
        outputService,
        outputDir: options.outputDir,
        silent: options.silent,
        forceOverwrite: options.forceOverwrite,
      });

      const packageFileService = new PackageFileService(ctx);

      outputService.updateLoadingText('Extracting package information...');
      const packages = packageFileService.getPackages();

      outputService.updateLoadingText('Fetching npm registry data...');
      const npmService = new NpmService(packages, ctx);

      outputService.updateLoadingText('Processing dependency information...');
      const exportList = npmService.getList();

      outputService.updateLoadingText('Generating summary...');
      const summary = new SummaryService(exportList, packageFileService, ctx);

      // Determine which export format to use (default is excel)
      const format = (options.format as ExportFormat) || 'excel';
      
      let exportService;
      if (format === 'json') {
        outputService.updateLoadingText('Creating JSON report...');
        exportService = new JsonService(exportList, summary, ctx);
      } else {
        outputService.updateLoadingText('Creating Excel report...');
        exportService = new ExcelService(exportList, summary, ctx);
      }

      // Get the file extension from the export service
      const fileExtension = exportService.getFileExtension();

      // Get a file path, either unique or overwriting existing files based on the forceOverwrite option
      const filePath = packageFileService.getExportFilePath(fileExtension, ctx.forceOverwrite);

      outputService.updateLoadingText(`Saving ${format.toUpperCase()} file to ${filePath}${fileExtension}...`);
      await exportService.saveToFile(filePath);

      outputService.stopLoadingSuccess('Export completed!');
    } catch (error) {
      outputService.stopLoadingError('Export failed');
      outputService.error(error as Error);
    }
  });

export default exportCommand;
