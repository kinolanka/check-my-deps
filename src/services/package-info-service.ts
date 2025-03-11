/**
 * @fileoverview Provides the PackageInfoService class for processing individual package information.
 *
 * This module implements a service for analyzing and enriching package data with features including:
 * - Parsing and normalizing package version information
 * - Determining update status (up-to-date, patch, minor, major)
 * - Identifying the latest versions available (latest, last minor)
 * - Detecting package source/registry information
 * - Checking deprecation status of packages and specific versions
 * - Generating comprehensive package information objects
 *
 * The service serves as the core data processor for individual package entries,
 * transforming raw npm data into structured, actionable information for reporting and updates.
 */

import Service from '@/services/service';
import type { ServiceCtxType } from '@/services/service-ctx';
import { NPM_REGISTRY_HOST } from '@/utils/constants';
import formatDate from '@/utils/helpers/format-date';
import getNpmPackageUrl from '@/utils/helpers/get-npm-package-url';
import type {
  NpmListDepItem,
  NpmRegistryPackageData,
  PackageSpec,
  PackageVersionSpec,
} from '@/utils/types';

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

  private npmRegistryData: NpmRegistryPackageData;

  constructor(
    args: {
      package: PackageSpec;
      npmListDepItem?: NpmListDepItem;
      npmRegistryData: NpmRegistryPackageData;
    },
    ctx: ServiceCtxType
  ) {
    super(ctx);

    this.packageName = args.package.packageName;

    this.dependencyType = args.package.dependencyType;

    this.versionRequired = args.package.versionRequired;

    this.npmListDepItem = args.npmListDepItem;

    this.npmRegistryData = args.npmRegistryData;

    this.setInstalledVersion();

    this.setLastMinorVersion();

    this.setLatestVersion();

    this.setRegistrySource();

    this.setPackageStatus();

    this.setDeprecated();
  }

  public getInfo(): PackageSpec {
    const packageSpec: PackageSpec = {
      packageName: this.packageName,
      dependencyType: this.dependencyType,
      versionRequired: this.versionRequired,
      versionInstalled: this.versionInstalled,
      versionLastMinor: this.versionLastMinor,
      registrySource: this.registrySource,
      updateStatus: this.updateStatus,
      deprecated: this.deprecated,
    };

    // Check if installed version is the same as latest version
    const isSameVersion =
      this.versionInstalled?.version &&
      this.versionLast?.version &&
      this.versionInstalled.version === this.versionLast.version;

    // Check if last minor version is the same as latest version
    const isLastMinorSameAsLast =
      this.versionLastMinor?.version &&
      this.versionLast?.version &&
      this.versionLastMinor.version === this.versionLast.version;

    // Only include versionLast if it's different from both versionInstalled AND versionLastMinor
    if (!isSameVersion && !isLastMinorSameAsLast) {
      packageSpec.versionLast = this.versionLast;
    }

    return packageSpec;
  }

  private setInstalledVersion() {
    const installedVersion = this.npmListDepItem?.version || '';

    if (installedVersion) {
      this.versionInstalled = {
        version: installedVersion,
        releaseDate: formatDate(this.npmRegistryData.time?.[installedVersion] || ''),
        npmUrl: getNpmPackageUrl(this.packageName, installedVersion),
        deprecated: this.isVersionDeprecated(installedVersion),
      };
    }
  }

  private setLastMinorVersion() {
    if (!this.versionInstalled?.version) {
      return;
    }

    const productionVersions = this.filterProductionVersions(this.npmRegistryData.versions);

    // Extract major and minor version numbers from installed version
    const [major, minor] = this.versionInstalled.version.split('.').map(Number);

    // Find the latest minor version that is greater than the installed minor version
    const lastMinorVersion = productionVersions
      // filter versions that match the installed major version and have a greater minor version
      .filter((version: string) => {
        const [vMajor, vMinor] = version.split('.').map(Number);

        return vMajor === major && vMinor > minor;
      })
      // Sort versions by semver
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
        releaseDate: formatDate(this.npmRegistryData.time?.[lastMinorVersion] || ''),
        npmUrl: getNpmPackageUrl(this.packageName, lastMinorVersion),
        deprecated: this.isVersionDeprecated(lastMinorVersion),
      };
    }
  }

  private setLatestVersion() {
    const productionVersions = this.filterProductionVersions(this.npmRegistryData.versions);

    // Sort versions by semver
    const latestVersion = productionVersions
      .sort((a, b) => {
        const [aMajor, aMinor, aPatch] = a.split('.').map(Number);

        const [bMajor, bMinor, bPatch] = b.split('.').map(Number);

        if (aMajor !== bMajor) return aMajor - bMajor;

        if (aMinor !== bMinor) return aMinor - bMinor;

        return aPatch - bPatch;
      })
      .pop();

    // Set the versionLast property
    if (latestVersion) {
      this.versionLast = {
        version: latestVersion,
        releaseDate: formatDate(this.npmRegistryData.time?.[latestVersion] || ''),
        npmUrl: getNpmPackageUrl(this.packageName, latestVersion),
        deprecated: this.isVersionDeprecated(latestVersion),
      };
    }
  }

  private setRegistrySource() {
    try {
      const resolvedUrl = this.npmListDepItem?.resolved;

      if (!resolvedUrl) {
        return;
      }

      // Handle different package source types
      if (
        resolvedUrl.startsWith(`https://${NPM_REGISTRY_HOST}/`) ||
        resolvedUrl.startsWith(`http://${NPM_REGISTRY_HOST}/`)
      ) {
        // Standard npm registry URL
        // Format: https://registry.npmjs.org/package-name/-/package-name-1.0.0.tgz
        const packagePath = resolvedUrl.split('/-/')[0];

        this.registrySource = packagePath;
      } else if (resolvedUrl.startsWith('https://') || resolvedUrl.startsWith('http://')) {
        // Other HTTP/HTTPS URLs (custom registries, tarballs, etc.)
        if (
          resolvedUrl.includes('github.com') ||
          resolvedUrl.includes('gitlab.com') ||
          resolvedUrl.includes('bitbucket.org')
        ) {
          // Git repository URLs
          this.registrySource = resolvedUrl.split('#')[0]; // Remove commit/branch reference
        } else {
          // Try to extract the package URL without version/tarball specifics
          const url = new URL(resolvedUrl);

          const pathParts = url.pathname.split('/-/');

          if (pathParts.length > 1) {
            // Registry URL with package path
            this.registrySource = `${url.origin}${pathParts[0]}`;
          } else {
            // Other HTTP URL
            this.registrySource = resolvedUrl;
          }
        }
      } else if (resolvedUrl.startsWith('git+')) {
        // Git URLs: git+https://, git+ssh://, etc.
        const gitUrl = resolvedUrl.substring(4).split('#')[0]; // Remove git+ prefix and fragment

        this.registrySource = gitUrl;
      } else if (resolvedUrl.startsWith('file:')) {
        // Local file references
        this.registrySource = resolvedUrl;
      } else if (resolvedUrl.startsWith('npm:')) {
        // npm alias packages
        const aliasedPackage = resolvedUrl.substring(4).split('@')[0];

        this.registrySource = `https://${NPM_REGISTRY_HOST}/${aliasedPackage}`;
      } else {
        // Any other format
        this.registrySource = resolvedUrl;
      }
    } catch (error) {
      this.ctx.outputService.error(error as Error);

      // Fallback to the original behavior
      this.registrySource = this.npmListDepItem?.resolved;
    }
  }

  private setPackageStatus() {
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

  private setDeprecated() {
    // Check if the package itself is deprecated
    if (this.npmRegistryData.deprecated) {
      this.deprecated = true;
    }
  }

  private isVersionDeprecated(version: string): boolean {
    // Check if the specific version is deprecated in the versions object
    const versionData = this.npmRegistryData.versions[version];

    if (versionData && typeof versionData === 'object' && 'deprecated' in versionData) {
      return !!versionData.deprecated;
    }

    return false;
  }

  private filterProductionVersions(versions: NpmRegistryPackageData['versions']) {
    // Extract version keys from the versions object
    return Object.keys(versions).filter((version: string) => !version.includes('-'));
  }
}

export default PackageInfoService;
