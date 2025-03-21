/**
 * @fileoverview Defines the 'update' command for the check-my-deps CLI tool.
 *
 * This module handles the update command functionality, which analyzes dependencies
 * in package.json and updates them according to specified semver rules.
 * The command supports multiple options including custom working directory,
 * silent mode, update level selection, and dry run mode.
 *
 * The update process follows these steps:
 * 1. Reads package.json and extracts dependency information
 * 2. Fetches latest version data from npm registry
 * 3. Determines which packages can be updated based on the specified level
 * 4. Displays proposed updates to the user
 * 5. Updates package.json with new versions (unless in dry-run mode)
 */

import { Command } from 'commander';

import NpmService from '@/services/npm-service';
import OutputService from '@/services/output-service';
import PackageFileService from '@/services/package-file-service';
import ServiceCtx from '@/services/service-ctx';
import UpdateService from '@/services/udpate/update-service';
import { PACKAGE_FILE_NAME } from '@/utils/constants';
import type { UpdateLevel } from '@/utils/types';

import type { OptionValues } from 'commander';

const updateCommand = new Command()
  .name('update')
  .description(`Update ${PACKAGE_FILE_NAME} dependencies according to specified semver rules`)
  .option(
    '-c, --cwd <cwd>',
    `The working directory where ${PACKAGE_FILE_NAME} is located. Defaults to the current directory.`
  )
  .option('-s, --silent', 'Prevent any output to the terminal.', false)
  .option(
    '-l, --level <level>',
    'Specify the semver update level (latest, minor, patch). Controls how aggressive updates will be.',
    'latest'
  )
  .option(
    '-d, --dry-run',
    `Show what would be updated without making actual changes to ${PACKAGE_FILE_NAME}.`,
    false
  )
  .action(async (options: OptionValues) => {
    const outputService = new OutputService(Boolean(options.silent));

    outputService.startLoading('Analyzing dependencies...');

    try {
      // Validate update level option
      const updateLevel = (options.level as UpdateLevel).toLowerCase() as UpdateLevel;

      // Validate update level
      if (!['latest', 'minor', 'patch'].includes(updateLevel)) {
        throw new Error('Invalid update level. Must be one of: latest, minor, patch');
      }

      outputService.updateLoadingText(`Reading ${PACKAGE_FILE_NAME}...`);

      // Create service context
      const ctx = new ServiceCtx({
        cwd: (options.cwd as string) || process.cwd(),
        outputService,
        silent: Boolean(options.silent),
      });

      outputService.updateLoadingText('Extracting package information...');

      // Initialize services
      const packageFileService = new PackageFileService(ctx);

      // Get packages from package.json
      const packages = packageFileService.getPackages();

      outputService.updateLoadingText('Fetching npm registry data...');

      // Initialize npm service
      const npmService = new NpmService(packages, ctx);

      outputService.updateLoadingText('Processing dependency information...');

      // Get package information from npm registry
      const packageInfoList = await npmService.getList();

      outputService.updateLoadingText('Determining updates...');

      // Initialize update service
      const updateService = new UpdateService(packageInfoList, updateLevel, ctx);

      // Determine updates
      const updates = updateService.prepareUpdates();

      // Check if there are updates
      if (updates.length === 0) {
        outputService.stopLoadingSuccess('All packages are already up to date!');

        return;
      }

      // Display the updates
      updateService.displayUpdates(updates);

      // If dry run, don't make changes
      if (options.dryRun) {
        outputService.stopLoadingSuccess(
          `Dry run completed. ${updates.length} packages would be updated.`
        );

        return;
      }

      // Update versions in package.json
      outputService.updateLoadingText(`Updating ${updates.length} packages...`);

      // Apply updates
      const updatedCount = updateService.applyUpdates(updates);

      // Check if any updates were applied
      if (updatedCount > 0) {
        outputService.stopLoadingSuccess(`Successfully updated ${updatedCount} packages!`);
      } else {
        outputService.stopLoadingSuccess('No packages needed updating.');
      }
    } catch (error) {
      // Stop loading and display error
      outputService.stopLoadingError('Update failed');

      outputService.error(error as Error);
    }
  });

export default updateCommand;
