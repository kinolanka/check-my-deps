/**
 * @fileoverview Provides the UpdateService class for updating package.json dependencies.
 *
 * This module implements a service for updating package dependencies with features including:
 * - Filtering packages that need updates based on specified update level (latest, minor, patch)
 * - Determining appropriate version prefixes (^, ~, etc.) for updates
 * - Handling special cases like deprecated packages and non-npm registry dependencies
 * - Applying updates to package.json while preserving formatting
 * - Providing feedback on update operations
 *
 * The service is used by the update command to intelligently update dependencies
 * according to user-specified constraints and best practices.
 */

import path from 'path';

import fs from 'fs-extra';

import type PackageInfoService from '@/services/package-info-service';
import type { ServiceType } from '@/services/service';
import Service from '@/services/service';
import { NPM_REGISTRY_HOST, PACKAGE_FILE_NAME, PACKAGE_LOCK_FILE_NAME } from '@/utils/constants';
import type { PackageStatus, PackageUpdateInfo, UpdateLevel } from '@/utils/types';

import type { PackageJson } from 'type-fest';

class UpdateService extends Service {
  private packageInfoList: PackageInfoService[];

  private updateLevel: UpdateLevel;

  private packageJsonPath: string;

  constructor(packageInfoList: PackageInfoService[], updateLevel: UpdateLevel, ctx: ServiceType) {
    super(ctx);

    this.packageInfoList = packageInfoList;

    this.updateLevel = updateLevel;

    this.packageJsonPath = path.resolve(this.ctx.cwd, PACKAGE_FILE_NAME);
  }

  /**
   * Gets the list of packages that need to be updated based on the specified update level
   */
  public getUpdatablePackages(): PackageInfoService[] {
    return this.packageInfoList.filter((pkg) => {
      const info = pkg.getInfo();

      // Skip packages without version info (might be missing from npm registry data)
      if (!info.updateStatus || !info.versionInstalled) {
        return false;
      }

      // For non-npm registry packages (like git, file, etc.), we need to check if they have valid version data
      // If they have valid version data and update status, we should consider them for updates
      if (info.registrySource && !info.registrySource.includes(NPM_REGISTRY_HOST)) {
        // For git/file dependencies, only update if we have valid version data and it's not up to date
        if (info.versionLast?.version || info.versionLastMinor?.version) {
          // Continue with normal update logic below
        } else {
          return false; // Skip if we don't have valid version data
        }
      }

      // Skip deprecated packages unless they have a non-deprecated newer version
      if (info.deprecated) {
        // If the package is deprecated but has a newer version that's not deprecated, allow the update
        let targetVersionDeprecated = true;

        if (this.updateLevel === 'latest' && info.versionLast) {
          targetVersionDeprecated = !!info.versionLast.deprecated;
        } else if (this.updateLevel === 'minor' && info.versionLastMinor) {
          targetVersionDeprecated = !!info.versionLastMinor.deprecated;
        } else if (this.updateLevel === 'patch' && info.versionInstalled) {
          targetVersionDeprecated = !!info.versionInstalled.deprecated;
        }

        if (targetVersionDeprecated) {
          return false; // Skip if the target version is also deprecated
        }
      }

      const status = info.updateStatus;

      if (this.updateLevel === 'latest') {
        // For latest, update any package that's not up to date
        return status !== 'upToDate';
      } else if (this.updateLevel === 'minor') {
        // For minor, only update packages with minor or patch updates
        return status === 'minor' || status === 'patch';
      } else if (this.updateLevel === 'patch') {
        // For patch, only update packages with patch updates
        return status === 'patch';
      }

      return false;
    });
  }

  /**
   * Prepares the list of updates to be applied
   */
  public prepareUpdates(): Array<PackageUpdateInfo> {
    const updatablePackages = this.getUpdatablePackages();

    const updates: Array<PackageUpdateInfo> = [];

    for (const pkg of updatablePackages) {
      const packageInfo = pkg.getInfo();

      const { packageName, dependencyType, versionRequired, updateStatus } = packageInfo;

      // Determine the target version based on update level
      let targetVersion: string | undefined;

      if (this.updateLevel === 'latest' && packageInfo.versionLast?.version) {
        targetVersion = packageInfo.versionLast.version;
      } else if (this.updateLevel === 'minor' && packageInfo.versionLastMinor?.version) {
        targetVersion = packageInfo.versionLastMinor.version;
      } else if (this.updateLevel === 'patch' && packageInfo.versionInstalled?.version) {
        targetVersion = packageInfo.versionInstalled.version;
      }

      if (!targetVersion) {
        continue;
      }

      // Determine the version prefix from the current version requirement
      const prefix = this.getVersionPrefix(versionRequired);

      const newVersion = `${prefix}${targetVersion}`;

      // Add to updates list
      updates.push({
        packageName,
        dependencyType,
        currentVersion: versionRequired,
        newVersion,
        updateType: updateStatus || 'patch',
        deprecated: packageInfo.deprecated,
      });
    }

    return updates;
  }

  /**
   * Applies the updates to package.json
   * @param updates The list of updates to apply
   * @param dryRun If true, don't actually make changes
   * @returns Number of packages updated
   */
  public applyUpdates(
    updates: Array<{
      packageName: string;
      dependencyType: string;
      newVersion: string;
    }>,
    dryRun = false
  ): number {
    if (dryRun) {
      return updates.length;
    }

    try {
      // Read the current package.json
      const packageJson = fs.readJSONSync(this.packageJsonPath) as PackageJson;

      let updatedCount = 0;

      for (const update of updates) {
        const { packageName, dependencyType, newVersion } = update;

        // Update the version in package.json
        if (packageJson[dependencyType] && typeof packageJson[dependencyType] === 'object') {
          const deps = packageJson[dependencyType] as Record<string, string>;

          if (deps[packageName] !== newVersion) {
            deps[packageName] = newVersion;

            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        // Write the updated package.json back to disk
        fs.writeJSONSync(this.packageJsonPath, packageJson, { spaces: 2 });

        // Log a message suggesting to run npm install
        this.ctx.outputService.log(`Package versions have been updated in ${PACKAGE_FILE_NAME}`);

        this.ctx.outputService.log(
          `Please run "npm install" to update your ${PACKAGE_LOCK_FILE_NAME} and node_modules`
        );

        this.ctx.outputService.log(
          'This will ensure your installed dependencies match the updated versions.'
        );
      }

      return updatedCount;
    } catch (error) {
      this.ctx.outputService.error(error as Error);

      return 0;
    }
  }

  /**
   * Displays the updates to be applied
   * @param updates The list of updates to display
   */
  public displayUpdates(
    updates: Array<{
      packageName: string;
      dependencyType: string;
      currentVersion: string;
      newVersion: string;
      updateType: PackageStatus;
      deprecated?: boolean;
    }>
  ): void {
    // Create a structured JSON object
    const jsonOutput = {
      timestamp: new Date().toISOString(),
      updateLevel: this.updateLevel,
      totalUpdates: updates.length,
      updates: updates.map((update) => ({
        packageName: update.packageName,
        dependencyType: update.dependencyType,
        currentVersion: update.currentVersion,
        newVersion: update.newVersion,
        updateType: update.updateType,
        deprecated: update.deprecated || false,
      })),
    };

    // Output the JSON string to the terminal
    // Force parameter ensures the JSON is always displayed even in silent mode
    this.ctx.outputService.msg(JSON.stringify(jsonOutput, null, 2), true);
  }

  /**
   * Extracts the version prefix from the current version requirement
   * e.g., "^1.2.3" returns "^", "~2.0.0" returns "~", "3.0.0" returns ""
   */
  private getVersionPrefix(versionRequired: string): string {
    // Handle complex version requirements
    if (
      versionRequired.startsWith('http') ||
      versionRequired.startsWith('git') ||
      versionRequired.startsWith('file:') ||
      versionRequired.startsWith('npm:') ||
      versionRequired.includes(':') ||
      versionRequired.includes('/')
    ) {
      // Non-semver version specifications (URLs, git repos, etc.)
      return '';
    }

    if (versionRequired.startsWith('^') || versionRequired.startsWith('~')) {
      return versionRequired.charAt(0);
    }

    return '';
  }
}

export default UpdateService;
