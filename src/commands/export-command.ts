/**
 * @fileoverview Defines the 'export' command for the check-my-deps CLI tool.
 *
 * This module handles the export command functionality, which analyzes dependencies
 * in package.json and generates detailed reports in various formats (Excel, JSON).
 * The command supports multiple options including custom working directory,
 * output directory, silent mode, and format selection.
 *
 * The export process follows these steps:
 * 1. Reads package.json and extracts dependency information
 * 2. Fetches latest version data from npm registry
 * 3. Processes and compares installed vs latest versions
 * 4. Generates a summary with package metadata
 * 5. Creates and saves the report in the specified format
 */

import { Command } from 'commander';

import ExcelService from '@/services/export/excel-service';
import JsonService from '@/services/export/json-service';
import SummaryService from '@/services/export/summary-service';
import NpmService from '@/services/npm-service';
import OutputService from '@/services/output-service';
import PackageFileService from '@/services/package-file-service';
import ServiceCtx from '@/services/service-ctx';
import { PACKAGE_FILE_NAME } from '@/utils/constants';
import type { ExportFormat } from '@/utils/types';

import type { OptionValues } from 'commander';

const exportCommand = new Command()
  .name('export')
  .description(
    `Analyze dependencies in ${PACKAGE_FILE_NAME} and export a detailed report with version information`
  )
  .option(
    '-c, --cwd <cwd>',
    `The working directory where ${PACKAGE_FILE_NAME} is located. Defaults to the current directory.`
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
    // Initialize output service
    const outputService = new OutputService(Boolean(options.silent));

    outputService.startLoading('Analyzing dependencies...');

    try {
      outputService.updateLoadingText(`Reading ${PACKAGE_FILE_NAME}...`);

      // Initialize service context
      const ctx = new ServiceCtx({
        cwd: (options.cwd as string) || process.cwd(),
        outputService,
        outputDir: (options.outputDir as string) || process.cwd(),
        silent: Boolean(options.silent),
        forceOverwrite: Boolean(options.forceOverwrite),
      });

      // Initialize package file service
      const packageFileService = new PackageFileService(ctx);

      outputService.updateLoadingText('Extracting package information...');

      // Get packages from package.json
      const packages = packageFileService.getPackages();

      outputService.updateLoadingText('Fetching npm registry data...');

      // Initialize npm service
      const npmService = new NpmService(packages, ctx);

      outputService.updateLoadingText('Processing dependency information...');

      // Get package information from npm registry
      const exportList = await npmService.getList();

      outputService.updateLoadingText('Generating summary...');

      // Initialize summary service
      const summary = new SummaryService(exportList, packageFileService, ctx);

      // Determine which export format to use (default is excel)
      const format: ExportFormat = (options.format as ExportFormat) || 'excel';

      let exportService;

      // Initialize export service
      if (format === 'json') {
        outputService.updateLoadingText('Creating JSON report...');

        // Initialize JSON export service
        exportService = new JsonService(exportList, summary, ctx);
      } else {
        outputService.updateLoadingText('Creating Excel report...');

        // Initialize Excel export service
        exportService = new ExcelService(exportList, summary, ctx);
      }

      // Get the file extension from the export service
      const fileExtension = exportService.getFileExtension();

      // Get a file path, either unique or overwriting existing files based on the forceOverwrite option
      const filePath = packageFileService.getExportFilePath(fileExtension, ctx.forceOverwrite);

      outputService.updateLoadingText(
        `Saving ${format.toUpperCase()} file to ${filePath}${fileExtension}...`
      );

      // Save the export file
      await exportService.saveToFile(filePath);

      outputService.stopLoadingSuccess('Export completed!');
    } catch (error) {
      // Stop loading and display error
      outputService.stopLoadingError('Export failed');

      outputService.error(error as Error);
    }
  });

export default exportCommand;
