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

import fs from 'fs';
import path from 'path';

import type PackageInfoService from '@/services/package-info-service';
import type { ServiceType } from '@/services/service';
import Service from '@/services/service';
import { PACKAGE_FILE_NAME, PACKAGE_LOCK_FILE_NAME } from '@/utils/constants';
import isNpmRegistryUrl from '@/utils/helpers/is-npm-registry-url';
import type { PackageUpdateInfo, UpdateLevel } from '@/utils/types';

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

      // Prioritize the latest version available, fall back to minor or patch if available
      if (this.updateLevel === 'latest') {
        targetVersion =
          packageInfo.versionLast?.version ||
          packageInfo.versionLastMinor?.version ||
          packageInfo.versionLastPatch?.version;
      } else if (this.updateLevel === 'minor') {
        targetVersion =
          packageInfo.versionLastMinor?.version || packageInfo.versionLastPatch?.version;
      } else if (this.updateLevel === 'patch' && packageInfo.versionLastPatch?.version) {
        targetVersion = packageInfo.versionLastPatch?.version;
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
  public applyUpdates(updates: Array<PackageUpdateInfo>, dryRun = false): number {
    if (dryRun) {
      return updates.length;
    }

    try {
      // Read the current package.json
      const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8')) as PackageJson;

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
        fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

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
  public displayUpdates(updates: Array<PackageUpdateInfo>): void {
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
        deprecated: update.deprecated,
      })),
    };

    // Output the JSON string to the terminal
    // Force parameter ensures the JSON is always displayed even in silent mode
    this.ctx.outputService.msg(JSON.stringify(jsonOutput, null, 2), true);
  }

  /**
   * Gets the list of packages that need to be updated based on the specified update level
   */
  private getUpdatablePackages(): PackageInfoService[] {
    // const input = [];

    const filteredList = this.packageInfoList.filter((pkg) => {
      const packageSpec = pkg.getInfo();

      // input.push(packageSpec);

      // Skip packages without version info
      if (!packageSpec.versionInstalled) {
        return false;
      }

      // Skip non-npm registry packages (like git, file, etc.)
      if (!packageSpec.registrySource || !isNpmRegistryUrl(packageSpec.registrySource)) {
        return false;
      }

      return true;
    });

    // console.log('input', JSON.stringify(input, null, 2));

    // console.log(
    //   'filteredList',
    //   JSON.stringify(
    //     filteredList.map((p) => p.getInfo()),
    //     null,
    //     2
    //   )
    // );

    return filteredList;
  }

  /**
   * Extracts the version prefix from the current version requirement
   * e.g., "^1.2.3" returns "^", "~2.0.0" returns "~", "3.0.0" returns ""
   */
  private getVersionPrefix(versionRequired: string): string {
    if (versionRequired.startsWith('^') || versionRequired.startsWith('~')) {
      return versionRequired.charAt(0);
    }

    return '';
  }
}

export default UpdateService;
