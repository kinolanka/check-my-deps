import { ServiceCtxType } from '@/services/service-ctx';
import Service from '@/services/service';
import extractRootDomain from '@/utils/helpers/extract-root-domain';
import getNpmPackageUrl from '@/utils/helpers/get-npm-package-url';
import { NpmListDepItem, NpmViewData, PackageSpec, PackageVersionSpec } from '@/utils/types';

class PackageInfoService extends Service {
  private packageName: string;

  private dependencyType: string;

  private versionRequired: string;

  private versionInstalled?: PackageVersionSpec;

  private versionLastMinor?: PackageVersionSpec;

  private versionLast?: PackageVersionSpec;

  private registrySource?: string;

  private updateStatus: PackageSpec['updateStatus'] = 'upToDate';

  private deprecated = false;

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

    this.dependencyType = args.package.dependencyType;

    this.versionRequired = args.package.versionRequired;

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
  }

  private _setPackageStatus() {
    if (!this.versionInstalled?.version || !this.versionLast?.version) {
      return;
    }

    const [installedMajor, installedMinor, installedPatch] = this.versionInstalled.version
      .split('.')
      .map(Number);
    const [latestMajor, latestMinor, latestPatch] = this.versionLast.version.split('.').map(Number);

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
    const installedVersion = this.npmListDepItem?.version || '';

    if (installedVersion) {
      this.versionInstalled = {
        version: installedVersion,
        releaseDate: this.npmViewData.time?.[installedVersion] || '',
        npmUrl: getNpmPackageUrl(this.packageName, installedVersion),
        deprecated: this._isVersionDeprecated(installedVersion),
      };
    }
  }

  private _filterProductionVersions(versions: string[]) {
    return versions.filter((version: string) => !version.includes('-'));
  }

  private _setLastMinorVersion() {
    if (!this.versionInstalled?.version) {
      return;
    }

    const productionVersions = this._filterProductionVersions(this.npmViewData.versions);

    const [major, minor] = this.versionInstalled.version.split('.').map(Number);

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
      this.versionLastMinor = {
        version: lastMinorVersion,
        releaseDate: this.npmViewData.time?.[lastMinorVersion] || '',
        npmUrl: getNpmPackageUrl(this.packageName, lastMinorVersion),
        deprecated: this._isVersionDeprecated(lastMinorVersion),
      };
    }
  }

  private _setLatestVersion() {
    const productionVersions = this._filterProductionVersions(this.npmViewData.versions);

    const latestVersion = productionVersions.pop() || '';

    if (latestVersion) {
      this.versionLast = {
        version: latestVersion,
        releaseDate: this.npmViewData.time?.[latestVersion] || '',
        npmUrl: getNpmPackageUrl(this.packageName, latestVersion),
        deprecated: this._isVersionDeprecated(latestVersion),
      };
    }
  }

  private _setSource() {
    try {
      const resolvedUrl = this.npmListDepItem?.resolved;

      if (resolvedUrl) {
        this.registrySource = extractRootDomain(resolvedUrl);
      }
    } catch (error) {
      this.ctx.outputService.error(error as Error);
    }
  }

  private _setDeprecated() {
    this.deprecated = !!this.npmViewData.deprecated;
  }

  private _isVersionDeprecated(version: string): boolean {
    // Check if the specific version is deprecated
    // npm registry can have version-specific deprecation messages in the form:
    // { versions: { "1.0.0": { deprecated: "message" } } }
    try {
      // If the entire package is deprecated
      if (this.npmViewData.deprecated) {
        return true;
      }
      
      // Check if there's version-specific deprecation info
      const versionData = this.npmViewData.versions?.[version];
      return versionData && (typeof versionData === 'object' && !!versionData.deprecated);
    } catch (error) {
      this.ctx.outputService.error(error as Error);
      return false;
    }
  }

  public getInfo(): PackageSpec {
    return {
      packageName: this.packageName,
      dependencyType: this.dependencyType,
      versionRequired: this.versionRequired,
      versionInstalled: this.versionInstalled,
      versionLastMinor: this.versionLastMinor,
      versionLast: this.versionLast,
      registrySource: this.registrySource,
      updateStatus: this.updateStatus,
      deprecated: this.deprecated,
    };
  }
}

export default PackageInfoService;
