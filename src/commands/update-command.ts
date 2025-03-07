import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { PackageJson } from 'type-fest';

import NpmService from '@/services/npm-service';
import OutputService from '@/services/output-service';
import PackageFileService from '@/services/package-file-service';
import PackageInfoService from '@/services/package-info-service';
import ServiceCtx from '@/services/service-ctx';
import { PackageSpec, PackageStatus } from '@/utils/types';

const updateCommand = new Command()
  .name('update')
  .description('Update package.json dependencies to their latest versions')
  .option(
    '-c, --cwd <cwd>',
    'the working directory. defaults to the current directory.',
    process.cwd()
  )
  .option('-s, --silent', 'prevent any output to the terminal', false)
  .option(
    '-l, --level <level>',
    'specify the semver update level (latest, minor, patch)',
    'latest'
  )
  .option(
    '-d, --dry-run',
    'show what would be updated without making changes',
    false
  )
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

      const packageFileService = new PackageFileService(ctx);
      const packageJsonPath = path.resolve(ctx.cwd, 'package.json');

      outputService.updateLoadingText('Extracting package information...');
      const packages = packageFileService.getPackages();

      outputService.updateLoadingText('Fetching npm registry data...');
      const npmService = new NpmService(packages, ctx);

      outputService.updateLoadingText('Processing dependency information...');
      const packageInfoList = npmService.getList();

      outputService.updateLoadingText('Determining updates...');
      const updatablePackages = getUpdatablePackages(packageInfoList, updateLevel);

      if (updatablePackages.length === 0) {
        outputService.stopLoadingSuccess('All packages are already up to date!');
        return;
      }

      // Read the current package.json
      const packageJson = fs.readJSONSync(packageJsonPath) as PackageJson;
      
      // Prepare the updates
      const updates: Array<{
        packageName: string;
        dependencyType: string;
        currentVersion: string;
        newVersion: string;
        updateType: PackageStatus;
        deprecated?: boolean;
      }> = [];
      
      for (const pkg of updatablePackages) {
        const packageInfo = pkg.getInfo();
        const { packageName, dependencyType, versionRequired, updateStatus } = packageInfo;
        
        // Determine the target version based on update level
        let targetVersion: string | undefined;
        
        if (updateLevel === 'latest' && packageInfo.versionLast?.version) {
          targetVersion = packageInfo.versionLast.version;
        } else if (updateLevel === 'minor' && packageInfo.versionLastMinor?.version) {
          targetVersion = packageInfo.versionLastMinor.version;
        } else if (updateLevel === 'patch' && packageInfo.versionInstalled?.version) {
          // For patch updates, we need to find the latest patch version
          // This is handled in the getUpdatablePackages function
          targetVersion = packageInfo.versionInstalled.version;
        }
        
        if (!targetVersion) {
          continue;
        }
        
        // Determine the version prefix from the current version requirement
        const prefix = getVersionPrefix(versionRequired);
        const newVersion = `${prefix}${targetVersion}`;
        
        // Add to updates list
        updates.push({
          packageName,
          dependencyType,
          currentVersion: versionRequired,
          newVersion,
          updateType: updateStatus || 'patch',
          deprecated: packageInfo.deprecated
        });
      }
      
      // Display the updates
      if (!options.silent) {
        outputService.stopLoading();
        console.log('\nPackages to update:');
        console.log('-------------------');
        
        for (const update of updates) {
          const updateLabel = getUpdateTypeLabel(update.updateType);
          console.log(`${update.packageName} (${update.dependencyType}):\n  ${update.currentVersion} → ${update.newVersion} (${updateLabel})`);
        }
        console.log('-------------------');
      }
      
      // If dry run, don't make changes
      if (options.dryRun) {
        outputService.stopLoadingSuccess(`Dry run completed. ${updates.length} packages would be updated.`);
        return;
      }
      
      // Update versions in package.json
      outputService.startLoading(`Updating ${updates.length} packages...`);
      let updatedCount = 0;
      
      for (const update of updates) {
        const { packageName, dependencyType, newVersion } = update;
        
        // Update the version in package.json
        if (packageJson[dependencyType as keyof PackageJson] && 
            typeof packageJson[dependencyType as keyof PackageJson] === 'object') {
          const deps = packageJson[dependencyType as keyof PackageJson] as Record<string, string>;
          if (deps[packageName] !== newVersion) {
            deps[packageName] = newVersion;
            updatedCount++;
          }
        }
      }
      
      if (updatedCount > 0) {
        // Write the updated package.json back to disk
        fs.writeJSONSync(packageJsonPath, packageJson, { spaces: 2 });
        outputService.stopLoadingSuccess(`Successfully updated ${updatedCount} packages!`);
      } else {
        outputService.stopLoadingSuccess('No packages needed updating.');
      }
    } catch (error) {
      outputService.stopLoadingError('Update failed');
      outputService.error(error as Error);
    }
  });

/**
 * Determines which packages need to be updated based on the specified update level
 */
function getUpdatablePackages(
  packageInfoList: PackageInfoService[],
  updateLevel: string
): PackageInfoService[] {
  return packageInfoList.filter((pkg) => {
    const info = pkg.getInfo();
    
    // Skip packages that aren't from npm registry
    if (!info.registrySource?.includes('registry.npmjs.org')) {
      return false;
    }
    
    // Skip deprecated packages
    if (info.deprecated) {
      return false;
    }
    
    const status = info.updateStatus;
    
    if (updateLevel === 'latest') {
      // For latest, update any package that's not up to date
      return status !== 'upToDate';
    } else if (updateLevel === 'minor') {
      // For minor, only update packages with minor or patch updates
      return status === 'minor' || status === 'patch';
    } else if (updateLevel === 'patch') {
      // For patch, only update packages with patch updates
      return status === 'patch';
    }
    
    return false;
  });
}

/**
 * Extracts the version prefix from the current version requirement
 * e.g., "^1.2.3" returns "^", "~2.0.0" returns "~", "3.0.0" returns ""
 */
function getVersionPrefix(versionRequired: string): string {
  // Handle complex version requirements
  if (versionRequired.startsWith('http') || 
      versionRequired.startsWith('git') || 
      versionRequired.startsWith('file:') || 
      versionRequired.startsWith('npm:') ||
      versionRequired.includes(':') ||
      versionRequired.includes('/')) {
    // Non-semver version specifications (URLs, git repos, etc.)
    return '';
  }
  
  if (versionRequired.startsWith('^') || versionRequired.startsWith('~')) {
    return versionRequired.charAt(0);
  }
  return '';
}

/**
 * Returns a human-readable label for the update type
 */
function getUpdateTypeLabel(updateType: PackageStatus): string {
  switch (updateType) {
    case 'major':
      return 'major update';
    case 'minor':
      return 'minor update';
    case 'patch':
      return 'patch update';
    case 'upToDate':
      return 'up to date';
    default:
      return updateType;
  }
}

export default updateCommand;
