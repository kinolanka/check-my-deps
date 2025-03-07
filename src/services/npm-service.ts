import { execSync } from 'child_process';
import chalk from 'chalk';

import Service, { ServiceType } from '@/services/service';
import PackageInfoService from '@/services/package-info-service';
import { NpmListData, NpmViewData, PackageSpec } from '@/utils/types';

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

      this.npmListData = JSON.parse(npmListDataBuffer.toString());
    } catch (error) {
      // Check if the error is related to version mismatches (ELSPROBLEMS)
      if (error instanceof Error && error.message.includes('ELSPROBLEMS')) {
        this.ctx.outputService.errorMsg('\nError: Version mismatch detected between package.json and package-lock.json');
        this.ctx.outputService.log('\nPlease run "npm install" to update your package-lock.json and node_modules');
        this.ctx.outputService.log('This is required before running the update command to ensure consistency.\n');
        process.exit(1); // Exit with error code
      } else {
        this.ctx.outputService.error(error as Error);
      }
      
      // Create a minimal structure to avoid null reference errors if execution continues
      // Ensure it conforms to NpmListData type by including required properties
      this.npmListData = { 
        name: 'unknown', 
        version: '0.0.0', 
        dependencies: {} 
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

  private _setDependenciesList() {
    const list = [];

    for (const currentPackage of this.packages) {
      const npmListDepItem = this.npmListData?.dependencies[currentPackage.packageName];

      const npmViewData = this._getNpmViewData(currentPackage.packageName);

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
