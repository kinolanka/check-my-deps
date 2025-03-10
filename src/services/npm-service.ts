/**
 * @fileoverview Provides the NpmService class for interacting with npm registry.
 *
 * This module implements a service for fetching and processing npm package information with features including:
 * - Retrieving local dependency information using 'npm list'
 * - Fetching package metadata from npm registry using 'npm view'
 * - Checking deprecation status of specific package versions
 * - Processing package data in parallel chunks for better performance
 * - Creating PackageInfoService instances with complete package information
 *
 * The service acts as a bridge between local package information and npm registry data,
 * providing a comprehensive view of dependencies and their available versions.
 */

import { execSync, exec } from 'child_process';

import PackageInfoService from '@/services/package-info-service';
import type { ServiceType } from '@/services/service';
import Service from '@/services/service';
import { PACKAGE_FILE_NAME, PACKAGE_LOCK_FILE_NAME } from '@/utils/constants';
import { processInChunks } from '@/utils/helpers/process-in-chunks';
import type { NpmListData, NpmViewData, PackageSpec } from '@/utils/types';

class NpmService extends Service {
  private packages: PackageSpec[];

  private npmListData: NpmListData | null = null;

  private list: PackageInfoService[] = [];

  constructor(packages: PackageSpec[], ctx: ServiceType) {
    super(ctx);

    this.packages = packages;

    this._init();
  }

  private _init() {
    this._setNpmListData();
  }

  private _setNpmListData() {
    try {
      const npmListDataBuffer = execSync('npm list --json --package-lock-only', {
        cwd: this.ctx.cwd,
      });

      this.npmListData = JSON.parse(npmListDataBuffer.toString()) as NpmListData;
    } catch (error) {
      // Check if the error is related to version mismatches (ELSPROBLEMS)
      if (error instanceof Error && error.message.includes('ELSPROBLEMS')) {
        this.ctx.outputService.errorMsg(
          `\nError: Version mismatch detected between ${PACKAGE_FILE_NAME} and ${PACKAGE_LOCK_FILE_NAME}`
        );

        this.ctx.outputService.log(
          `\nPlease run "npm install" to update your ${PACKAGE_LOCK_FILE_NAME} and node_modules`
        );

        this.ctx.outputService.log(
          'This is required before running the update command to ensure consistency.\n'
        );

        process.exit(1); // Exit with error code
      } else {
        this.ctx.outputService.error(error as Error);
      }

      // Create a minimal structure to avoid null reference errors if execution continues
      // Ensure it conforms to NpmListData type by including required properties
      this.npmListData = {
        name: 'unknown',
        version: '0.0.0',
        dependencies: {},
      };
    }
  }

  private _getNpmViewData(packageName: string): Promise<NpmViewData> {
    return new Promise((resolve, reject) => {
      exec(
        `npm view ${packageName} versions time homepage repository deprecated --json`,
        { cwd: this.ctx.cwd },
        (error, stdout) => {
          if (error) {
            reject(error);
          } else {
            try {
              const npmViewData = JSON.parse(stdout) as NpmViewData;

              resolve(npmViewData);
            } catch (parseError) {
              reject(parseError);
            }
          }
        }
      );
    });
  }

  private async _getVersionDeprecationStatus(
    packageName: string,
    version: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      exec(
        `npm view ${packageName}@${version} deprecated --json`,
        { cwd: this.ctx.cwd },
        (error, stdout) => {
          if (error) {
            this.ctx.outputService.error(error);

            resolve(false);

            return;
          }

          const result = stdout.toString().trim();

          // If the result is empty or 'undefined', the version is not deprecated
          if (!result || result === 'undefined') {
            resolve(false);

            return;
          }

          // Otherwise, the version is deprecated
          resolve(true);
        }
      );
    });
  }

  private async _setDependenciesList() {
    // Create a structure to hold package data for processing
    const packageDataList = this.packages.map((pkg) => {
      const npmListDepItem = this.npmListData?.dependencies[pkg.packageName];

      return { pkg, npmListDepItem };
    });

    // Fetch npm view data in chunks of 5 using processInChunks
    const npmViewDataResponses = await processInChunks(
      packageDataList,
      async ({ pkg }) => this._getNpmViewData(pkg.packageName),
      5
    );

    this.list = await processInChunks(
      packageDataList,
      async ({ pkg, npmListDepItem }, index) => {
        const npmViewData = npmViewDataResponses[index];

        // Initialize versionDeprecations object if it doesn't exist
        if (!npmViewData.versionDeprecations) {
          npmViewData.versionDeprecations = {};
        }

        // Create a temporary PackageInfoService to get version information
        // This is needed to determine which versions we need to check for deprecation
        const tempPackageInfo = new PackageInfoService(
          {
            package: pkg,
            npmListDepItem,
            npmViewData,
          },
          this.ctx
        );

        const tempInfo = tempPackageInfo.getInfo();

        // Collect all versions that need deprecation status checks
        const versionsToCheck = [];

        // Check if the installed version needs deprecation status
        if (
          npmListDepItem?.version &&
          !(npmListDepItem.version in npmViewData.versionDeprecations)
        ) {
          versionsToCheck.push({
            version: npmListDepItem.version,
            packageName: pkg.packageName,
          });
        }

        // Check if last minor version needs deprecation status
        if (
          tempInfo.versionLastMinor?.version &&
          !(tempInfo.versionLastMinor.version in npmViewData.versionDeprecations)
        ) {
          versionsToCheck.push({
            version: tempInfo.versionLastMinor.version,
            packageName: pkg.packageName,
          });
        }

        // Check if latest version needs deprecation status
        if (
          tempInfo.versionLast?.version &&
          !(tempInfo.versionLast.version in npmViewData.versionDeprecations)
        ) {
          versionsToCheck.push({
            version: tempInfo.versionLast.version,
            packageName: pkg.packageName,
          });
        }

        // Run all deprecation checks in parallel
        const deprecationChecks = versionsToCheck.map(({ version, packageName }) =>
          this._getVersionDeprecationStatus(packageName, version).then((isDeprecated) => ({
            version,
            isDeprecated,
          }))
        );

        const deprecationResults = await Promise.all(deprecationChecks);

        // Update npmViewData with deprecation results
        for (const { version, isDeprecated } of deprecationResults) {
          npmViewData.versionDeprecations[version] = isDeprecated;
        }

        // Create the final PackageInfoService with complete deprecation information
        return new PackageInfoService(
          {
            package: pkg,
            npmListDepItem,
            npmViewData,
          },
          this.ctx
        );
      },
      5
    );
  }

  public async getList(): Promise<PackageInfoService[]> {
    await this._setDependenciesList();

    return this.list;
  }
}

export default NpmService;
