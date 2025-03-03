import { execSync } from 'child_process';

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
      this.ctx.outputService.error(error as Error);
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
