import { execSync } from 'child_process';

import PackageInfoService from '@/services/package-info-service';
import type { ServiceType } from '@/services/service';
import Service from '@/services/service';
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

    this._setDependenciesList();
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
          '\nError: Version mismatch detected between package.json and package-lock.json'
        );
        this.ctx.outputService.log(
          '\nPlease run "npm install" to update your package-lock.json and node_modules'
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

  private _getNpmViewData(packageName: string) {
    const npmViewDataBuffer = execSync(
      `npm view ${packageName} versions time homepage repository deprecated --json`,
      { cwd: this.ctx.cwd }
    );

    return JSON.parse(npmViewDataBuffer.toString()) as NpmViewData;
  }

  private _getVersionDeprecationStatus(packageName: string, version: string): boolean {
    try {
      // Make a specific call to get information about this version
      const versionDataBuffer = execSync(`npm view ${packageName}@${version} deprecated --json`, {
        cwd: this.ctx.cwd,
      });

      const result = versionDataBuffer.toString().trim();

      // If the result is empty or 'undefined', the version is not deprecated
      if (!result || result === 'undefined') {
        return false;
      }

      // Otherwise, the version is deprecated
      return true;
    } catch (error) {
      this.ctx.outputService.error(error as Error);
      return false;
    }
  }

  private _setDependenciesList() {
    const list = [];

    for (const currentPackage of this.packages) {
      const npmListDepItem = this.npmListData?.dependencies[currentPackage.packageName];

      const npmViewData = this._getNpmViewData(currentPackage.packageName);

      // Initialize versionDeprecations object if it doesn't exist
      if (!npmViewData.versionDeprecations) {
        npmViewData.versionDeprecations = {};
      }

      // Check if the installed version is deprecated
      if (npmListDepItem?.version) {
        const isInstalledVersionDeprecated = this._getVersionDeprecationStatus(
          currentPackage.packageName,
          npmListDepItem.version
        );
        npmViewData.versionDeprecations[npmListDepItem.version] = isInstalledVersionDeprecated;
      }

      // Create a temporary PackageInfoService to get version information
      // This is needed to determine which versions we need to check for deprecation
      const tempPackageInfo = new PackageInfoService(
        {
          package: currentPackage,
          npmListDepItem,
          npmViewData,
        },
        this.ctx
      );

      const tempInfo = tempPackageInfo.getInfo();

      // Check last minor version deprecation if available
      if (
        tempInfo.versionLastMinor?.version &&
        !(tempInfo.versionLastMinor.version in npmViewData.versionDeprecations)
      ) {
        const isLastMinorDeprecated = this._getVersionDeprecationStatus(
          currentPackage.packageName,
          tempInfo.versionLastMinor.version
        );
        npmViewData.versionDeprecations[tempInfo.versionLastMinor.version] = isLastMinorDeprecated;
      }

      // Check latest version deprecation if available
      if (
        tempInfo.versionLast?.version &&
        !(tempInfo.versionLast.version in npmViewData.versionDeprecations)
      ) {
        const isLatestDeprecated = this._getVersionDeprecationStatus(
          currentPackage.packageName,
          tempInfo.versionLast.version
        );
        npmViewData.versionDeprecations[tempInfo.versionLast.version] = isLatestDeprecated;
      }

      // Create the final PackageInfoService with complete deprecation information
      const packageInfo = new PackageInfoService(
        {
          package: currentPackage,
          npmListDepItem,
          npmViewData,
        },
        this.ctx
      );

      list.push(packageInfo);
    }

    this.list = list;
  }

  public getList(): PackageInfoService[] {
    return this.list;
  }
}

export default NpmService;
