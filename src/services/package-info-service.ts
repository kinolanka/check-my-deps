import { ServiceCtxType } from '@/services/service-ctx';
import Service from '@/services/service';
import extractRootDomain from '@/utils/helpers/extract-root-domain';
import { NpmListDepItem, NpmViewData, PackageSpec } from '@/utils/types';

class PackageInfoService extends Service {
  private packageName: PackageSpec['packageName'];

  private depType: PackageSpec['depType'];

  private curVersion: PackageSpec['curVersion'];

  private installedVersion: PackageSpec['installedVersion'] = '';

  private installedVersionReleaseDate: PackageSpec['installedVersionReleaseDate'] = '';

  private lastMinorVersion: PackageSpec['lastMinorVersion'] = '';

  private latestVersion: PackageSpec['latestVersion'] = '';

  private latestVersionReleaseDate: PackageSpec['latestVersionReleaseDate'] = '';

  private source: PackageSpec['source'] = '';

  private packageStatus: PackageSpec['packageStatus'] = 'upToDate';

  private npmListDepItem?: NpmListDepItem;

  private npmViewData: NpmViewData;

  constructor(
    args: {
      package: PackageSpec;
      npmListDepItem?: NpmListDepItem;
      npmViewData: NpmViewData;
    },
    ctx: ServiceCtxType
  ) {
    super(ctx);

    this.packageName = args.package.packageName;

    this.depType = args.package.depType;

    this.curVersion = args.package.curVersion;

    this.npmListDepItem = args.npmListDepItem;

    this.npmViewData = args.npmViewData;

    this._init();
  }

  private _init() {
    this._setInstalledVersion();

    this._setLastMinorVersion();

    this._setLatestVersion();

    this._setSource();

    this._setPackageStatus();
  }

  private _setPackageStatus() {
    if (!this.installedVersion || !this.latestVersion) {
      return;
    }

    const [installedMajor, installedMinor, installedPatch] = this.installedVersion
      .split('.')
      .map(Number);
    const [latestMajor, latestMinor, latestPatch] = this.latestVersion.split('.').map(Number);

    if (
      installedMajor === latestMajor &&
      installedMinor === latestMinor &&
      installedPatch === latestPatch
    ) {
      this.packageStatus = 'upToDate';
    } else if (installedMajor === latestMajor && installedMinor === latestMinor) {
      this.packageStatus = 'patch';
    } else if (installedMajor === latestMajor) {
      this.packageStatus = 'minor';
    } else {
      this.packageStatus = 'major';
    }
  }

  private _setInstalledVersion() {
    this.installedVersion = this.npmListDepItem?.version || '';

    if (this.installedVersion) {
      this.installedVersionReleaseDate = this.npmViewData.time?.[this.installedVersion] || '';
    }
  }

  private _filterProductionVersions(versions: string[]) {
    return versions.filter((version: string) => !version.includes('-'));
  }

  private _setLastMinorVersion() {
    if (!this.installedVersion) {
      return;
    }

    const productionVersions = this._filterProductionVersions(this.npmViewData.versions);

    const [major, minor] = this.installedVersion.split('.').map(Number);

    const lastMinorVersion = productionVersions
      .filter((version: string) => {
        const [vMajor, vMinor] = version.split('.').map(Number);
        return vMajor === major && vMinor > minor;
      })
      .sort((a: string, b: string) => {
        const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
        const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
        if (aMajor !== bMajor) return aMajor - bMajor;
        if (aMinor !== bMinor) return aMinor - bMinor;
        return aPatch - bPatch;
      })
      .pop();

    if (lastMinorVersion) {
      this.lastMinorVersion = lastMinorVersion;
    }
  }

  private _setLatestVersion() {
    const productionVersions = this._filterProductionVersions(this.npmViewData.versions);

    this.latestVersion = productionVersions.pop() || '';

    if (this.latestVersion) {
      this.latestVersionReleaseDate = this.npmViewData.time?.[this.latestVersion] || '';
    }
  }

  private _setSource() {
    try {
      const resolvedUrl = this.npmListDepItem?.resolved;

      if (resolvedUrl) {
        this.source = extractRootDomain(resolvedUrl);
      }
    } catch (error) {
      this.ctx.outputService.error(error as Error);
    }
  }

  public getInfo(): PackageSpec {
    return {
      packageName: this.packageName,
      depType: this.depType,
      curVersion: this.curVersion,
      installedVersion: this.installedVersion,
      installedVersionReleaseDate: this.installedVersionReleaseDate,
      lastMinorVersion: this.lastMinorVersion,
      latestVersion: this.latestVersion,
      latestVersionReleaseDate: this.latestVersionReleaseDate,
      source: this.source,
      packageStatus: this.packageStatus,
    };
  }
}

export default PackageInfoService;
