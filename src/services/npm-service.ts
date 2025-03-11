/**
 * @fileoverview Provides the NpmService class for interacting with npm registry.
 *
 * This module implements a service for fetching and processing npm package information with features including:
 * - Retrieving local dependency information using 'npm list'
 * - Fetching package metadata directly from npm registry API
 * - Processing package data in parallel chunks for better performance
 * - Creating PackageInfoService instances with complete package information
 *
 * The service acts as a bridge between local package information and npm registry data,
 * providing a comprehensive view of dependencies and their available versions.
 */

import { execSync } from 'child_process';

import PackageInfoService from '@/services/package-info-service';
import type { ServiceType } from '@/services/service';
import Service from '@/services/service';
import { PACKAGE_FILE_NAME, PACKAGE_LOCK_FILE_NAME } from '@/utils/constants';
import npmRegistryClient from '@/utils/helpers/npm-registry-client';
import { processInChunks } from '@/utils/helpers/process-in-chunks';
import type { NpmListData, NpmRegistryPackageData, PackageSpec } from '@/utils/types';

class NpmService extends Service {
  // This parameter contains the list of packages to process
  private packagesInputList: PackageSpec[];

  // This parameter contains the output of `npm list --json --package-lock-only`
  private npmListData: NpmListData | null = null;

  // This parameter contains the list of the packages npm registry data
  private packagesOutputList: PackageInfoService[] = [];

  constructor(packagesInputList: PackageSpec[], ctx: ServiceType) {
    super(ctx);

    this.packagesInputList = packagesInputList;

    this.setNpmListData();
  }

  public async getList(): Promise<PackageInfoService[]> {
    await this.setPackagesOutputList();

    return this.packagesOutputList;
  }

  private setNpmListData() {
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

  private async setPackagesOutputList() {
    // Create a structure to hold package data for processing
    const packageDataList = this.packagesInputList.map((pkg) => {
      const npmListDepItem = this.npmListData?.dependencies[pkg.packageName];

      return { pkg, npmListDepItem };
    });

    // Fetch npm view data in chunks of 5 using processInChunks
    const npmRegistryDataResponses = await processInChunks(
      packageDataList,
      async ({ pkg }) => this.getNpmRegistryData(pkg.packageName),
      5
    );

    this.packagesOutputList = packageDataList.map(({ pkg, npmListDepItem }, index) => {
      const npmRegistryData = npmRegistryDataResponses[index];

      // Create the final PackageInfoService with complete deprecation information
      return new PackageInfoService(
        {
          package: pkg,
          npmListDepItem,
          npmRegistryData,
        },
        this.ctx
      );
    });
  }

  private async getNpmRegistryData(packageName: string): Promise<NpmRegistryPackageData> {
    try {
      const registryData = await npmRegistryClient.getPackageData(packageName);

      return registryData;
    } catch (error) {
      throw new Error(`Failed to fetch npm registry data for ${packageName}: ${error}`);
    }
  }
}

export default NpmService;
