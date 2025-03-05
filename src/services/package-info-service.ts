import { ServiceCtxType } from '@/services/service-ctx';
import Service from '@/services/service';
import extractRootDomain from '@/utils/helpers/extract-root-domain';
import getNpmPackageUrl from '@/utils/helpers/get-npm-package-url';
import { NpmListDepItem, NpmViewData, PackageSpec } from '@/utils/types';

class PackageInfoService extends Service {
  private packageName: string;

  private depType: string;

  private reqVersion: string;

  private installedVersion?: string;

  private installDate?: string;

  private latestMinor?: string;

  private latestMinorDate?: string;

  private latestVersion?: string;

  private latestVersionDate?: string;

  private regSource?: string;

  private updateStatus: PackageSpec['updateStatus'] = 'upToDate';

  private deprecated = false;

  private installedVersionUrl?: string;

  private latestMinorUrl?: string;

  private latestVersionUrl?: string;

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

    this.reqVersion = args.package.reqVersion;

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

    this._setDeprecated();

    this._setPackageUrls();
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
      this.updateStatus = 'upToDate';
    } else if (installedMajor === latestMajor && installedMinor === latestMinor) {
      this.updateStatus = 'patch';
    } else if (installedMajor === latestMajor) {
      this.updateStatus = 'minor';
    } else {
      this.updateStatus = 'major';
    }
  }

  private _setInstalledVersion() {
    this.installedVersion = this.npmListDepItem?.version || '';

    if (this.installedVersion) {
      this.installDate = this.npmViewData.time?.[this.installedVersion] || '';
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
      this.latestMinor = lastMinorVersion;

      this.latestMinorDate = this.npmViewData.time?.[this.latestMinor] || '';
    }
  }

  private _setLatestVersion() {
    const productionVersions = this._filterProductionVersions(this.npmViewData.versions);

    this.latestVersion = productionVersions.pop() || '';

    if (this.latestVersion) {
      this.latestVersionDate = this.npmViewData.time?.[this.latestVersion] || '';
    }
  }

  private _setSource() {
    try {
      const resolvedUrl = this.npmListDepItem?.resolved;

      if (resolvedUrl) {
        this.regSource = extractRootDomain(resolvedUrl);
      }
    } catch (error) {
      this.ctx.outputService.error(error as Error);
    }
  }

  private _setDeprecated() {
    this.deprecated = !!this.npmViewData.deprecated;
  }

  private _setPackageUrls() {
    // Generate installed version URL if available
    if (this.installedVersion) {
      this.installedVersionUrl = getNpmPackageUrl(this.packageName, this.installedVersion);
    }

    // Generate latest minor version URL if available
    if (this.latestMinor) {
      this.latestMinorUrl = getNpmPackageUrl(this.packageName, this.latestMinor);
    }

    // Generate latest version URL if available
    if (this.latestVersion) {
      this.latestVersionUrl = getNpmPackageUrl(this.packageName, this.latestVersion);
    }
  }

  public getInfo(): PackageSpec {
    return {
      packageName: this.packageName,
      depType: this.depType,
      reqVersion: this.reqVersion,
      installedVersion: this.installedVersion,
      installedVersionUrl: this.installedVersionUrl,
      installDate: this.installDate,
      latestMinor: this.latestMinor,
      latestMinorUrl: this.latestMinorUrl,
      latestMinorDate: this.latestMinorDate,
      latestVersion: this.latestVersion,
      latestVersionUrl: this.latestVersionUrl,
      latestVersionDate: this.latestVersionDate,
      regSource: this.regSource,
      updateStatus: this.updateStatus,
      deprecated: this.deprecated,
    };
  }
}

export default PackageInfoService;
