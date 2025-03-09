import { Command } from 'commander';

import ExcelService from '@/services/excel-service';
import JsonService from '@/services/json-service';
import NpmService from '@/services/npm-service';
import OutputService from '@/services/output-service';
import PackageFileService from '@/services/package-file-service';
import ServiceCtx from '@/services/service-ctx';
import SummaryService from '@/services/summary-service';
import type { ExportFormat } from '@/utils/types';

import type { OptionValues } from 'commander';

const exportCommand = new Command()
  .name('export')
  .description(
    'Analyze dependencies in package.json and export a detailed report with version information'
  )
  .option(
    '-c, --cwd <cwd>',
    'The working directory where package.json is located. Defaults to the current directory.'
  )
  .option(
    '-o, --output-dir <outputDir>',
    'The directory where the export file will be saved. Defaults to the current directory.'
  )
  .option('-s, --silent', 'Prevent any output to the terminal.', false)
  .option(
    '-f, --force-overwrite',
    'Overwrite existing export files instead of creating unique filenames.',
    false
  )
  .option('--format <format>', 'The format of the export file (excel or json).', 'excel')
  .action(async (options: OptionValues) => {
    const outputService = new OutputService(Boolean(options.silent));
    outputService.startLoading('Analyzing dependencies...');

    try {
      outputService.updateLoadingText('Reading package.json...');
      const ctx = new ServiceCtx({
        cwd: (options.cwd as string) || process.cwd(),
        outputService,
        outputDir: (options.outputDir as string) || process.cwd(),
        silent: Boolean(options.silent),
        forceOverwrite: Boolean(options.forceOverwrite),
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
      const format: ExportFormat = (options.format as ExportFormat) || 'excel';

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

      outputService.updateLoadingText(
        `Saving ${format.toUpperCase()} file to ${filePath}${fileExtension}...`
      );
      await exportService.saveToFile(filePath);

      outputService.stopLoadingSuccess('Export completed!');
    } catch (error) {
      outputService.stopLoadingError('Export failed');
      outputService.error(error as Error);
    }
  });

export default exportCommand;
