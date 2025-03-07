import { Command } from 'commander';

import NpmService from '@/services/npm-service';
import OutputService from '@/services/output-service';
import PackageFileService from '@/services/package-file-service';
import ServiceCtx from '@/services/service-ctx';
import UpdateService from '@/services/update-service';

const updateCommand = new Command()
  .name('update')
  .description('Update package.json dependencies to their latest versions')
  .option(
    '-c, --cwd <cwd>',
    'the working directory. defaults to the current directory.',
    process.cwd()
  )
  .option('-s, --silent', 'prevent any output to the terminal', false)
  .option('-l, --level <level>', 'specify the semver update level (latest, minor, patch)', 'latest')
  .option('-d, --dry-run', 'show what would be updated without making changes', false)
  .action(async (options) => {
    const outputService = new OutputService(options.silent);
    outputService.startLoading('Analyzing dependencies...');

    try {
      // Validate update level option
      const updateLevel = options.level.toLowerCase();
      if (!['latest', 'minor', 'patch'].includes(updateLevel)) {
        throw new Error('Invalid update level. Must be one of: latest, minor, patch');
      }

      outputService.updateLoadingText('Reading package.json...');
      const ctx = new ServiceCtx({
        cwd: options.cwd,
        outputService,
        silent: options.silent,
      });

      outputService.updateLoadingText('Extracting package information...');
      const packageFileService = new PackageFileService(ctx);
      const packages = packageFileService.getPackages();

      outputService.updateLoadingText('Fetching npm registry data...');
      const npmService = new NpmService(packages, ctx);

      outputService.updateLoadingText('Processing dependency information...');
      const packageInfoList = npmService.getList();

      outputService.updateLoadingText('Determining updates...');
      const updateService = new UpdateService(packageInfoList, updateLevel, ctx);
      const updates = updateService.prepareUpdates();

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
      const updatedCount = updateService.applyUpdates(updates);

      if (updatedCount > 0) {
        outputService.stopLoadingSuccess(`Successfully updated ${updatedCount} packages!`);
      } else {
        outputService.stopLoadingSuccess('No packages needed updating.');
      }
    } catch (error) {
      outputService.stopLoadingError('Update failed');
      outputService.error(error as Error);
    }
  });

export default updateCommand;
