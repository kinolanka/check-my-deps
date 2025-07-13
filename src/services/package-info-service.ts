/**
 * @fileoverview Provides the PackageInfoService class for processing individual package information.
 *
 * This module implements a service for analyzing and enriching package data with features including:
 * - Parsing and normalizing package version information
 * - Determining update status (up-to-date, patch, minor, major)
 * - Identifying the latest versions available (latest, last minor, last patch)
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
import calculateTimeSinceRelease from '@/utils/helpers/calculate-time-since-release';
import formatDate from '@/utils/helpers/format-date';
import getNpmPackageUrl from '@/utils/helpers/get-npm-package-url';
import isNpmRegistryUrl from '@/utils/helpers/is-npm-registry-url';
import type {
  NpmListDepItem,
  NpmRegistryPackageData,
  PackageSpec,
  PackageStatus,
  PackageVersionSpec,
  TimeUnit,
} from '@/utils/types';

class PackageInfoService extends Service {
  private npmListDepItem: NpmListDepItem;

  private npmRegistryData: NpmRegistryPackageData;

  private lastVersion: string = '';

  private lastVersionStatus: PackageStatus | '' = '';

  private timeUnit: TimeUnit = 'months'; // Default time unit

  private packageName: PackageSpec['packageName'];

  private dependencyType: PackageSpec['dependencyType'];

  private versionRequired: PackageSpec['versionRequired'];

  private versionInstalled?: PackageVersionSpec;

  private versionLastPatch?: PackageVersionSpec;

  private versionLastMinor?: PackageVersionSpec;

  private versionLastMajor?: PackageVersionSpec;

  private registrySource?: PackageSpec['registrySource'];

  private updateStatus?: PackageSpec['updateStatus'];

  constructor(
    args: {
      package: PackageSpec;
      npmListDepItem: NpmListDepItem;
      npmRegistryData: NpmRegistryPackageData;
    },
    ctx: ServiceCtxType
  ) {
    super(ctx);

    this.npmListDepItem = args.npmListDepItem;

    this.npmRegistryData = args.npmRegistryData;

    this.packageName = args.package.packageName;

    this.dependencyType = args.package.dependencyType;

    this.versionRequired = args.package.versionRequired;

    if (this.npmRegistryData) {
      this.lastVersion = this.getLastVersion();

      this.lastVersionStatus = this.getLastVersionStatus();

      this.versionInstalled = this.getInstalledVersionSpec();

      this.versionLastPatch = this.getLastPatchVersionSpec();

      this.versionLastMinor = this.getLastMinorVersionSpec();

      this.versionLastMajor = this.getLastMajorVersionSpec();

      this.registrySource = this.getRegistrySource();

      this.updateStatus = this.lastVersionStatus;
    }
  }

  /**
   * Gets the package information
   * @returns The package information object
   */
  public getInfo(): PackageSpec {
    return {
      packageName: this.packageName,
      dependencyType: this.dependencyType,
      versionRequired: this.versionRequired,
      versionInstalled: this.versionInstalled,
      versionLastPatch: this.versionLastPatch,
      versionLastMinor: this.versionLastMinor,
      versionLastMajor: this.versionLastMajor,
      registrySource: this.registrySource,
      updateStatus: this.updateStatus,
    };
  }

  private getInstalledVersionSpec(): PackageVersionSpec {
    const installedVersion = this.getInstalledVersion();

    return this.getSpec(installedVersion);
  }

  private getLastPatchVersionSpec(): PackageVersionSpec | undefined {
    if (['upToDate'].includes(this.lastVersionStatus)) {
      return;
    }

    if (this.lastVersionStatus === 'patch') {
      return this.getSpec(this.lastVersion);
    }

    const installedVersion = this.getInstalledVersion();

    const isInstalledPreRelease = this.isPreReleaseVersion(installedVersion);

    let lastPatchVersion: string | undefined;

    // If installed version is pre-release, look for newer pre-releases with same base version
    if (isInstalledPreRelease) {
      lastPatchVersion = this.findNewerPreReleaseInSameRange(installedVersion);
    }

    // If no pre-release update found, or for production installations, look for production patch versions
    if (!lastPatchVersion) {
      const productionVersions = this.filterProductionVersions(this.npmRegistryData.versions);

      // If original installation was pre-release, compare against its base version to find production patches
      // If original installation was production, compare against installed version directly
      const versionToCompare = isInstalledPreRelease
        ? this.parseBaseVersion(installedVersion)
        : installedVersion;

      const [major, minor, patch] = this.splitSemver(versionToCompare);

      // Find the latest patch version that is greater than the comparison version
      lastPatchVersion = productionVersions
        .filter((version: string) => {
          const [vMajor, vMinor, vPatch] = this.splitSemver(version);

          return vMajor === major && vMinor === minor && vPatch > patch;
        })
        .sort(this.compareSemverVersions)
        .pop();
    }

    if (lastPatchVersion) {
      return this.getSpec(lastPatchVersion);
    }
  }

  private getLastMinorVersionSpec(): PackageVersionSpec | undefined {
    if (['patch', 'upToDate'].includes(this.lastVersionStatus)) {
      return;
    }

    if (this.lastVersionStatus === 'minor') {
      return this.getSpec(this.lastVersion);
    }

    const installedVersion = this.getInstalledVersion();

    const productionVersions = this.filterProductionVersions(this.npmRegistryData.versions);

    // Extract major and minor version numbers from installed version
    const [major, minor] = this.splitSemver(installedVersion);

    // Find the latest minor version that is greater than the installed minor version
    const lastMinorVersion = productionVersions
      // filter versions that match the installed major version and have a greater minor version
      .filter((version: string) => {
        const [vMajor, vMinor] = this.splitSemver(version);

        return vMajor === major && vMinor > minor;
      })
      // Sort versions by semver
      .sort(this.compareSemverVersions)
      .pop();

    if (lastMinorVersion) {
      return this.getSpec(lastMinorVersion);
    }
  }

  private getLastMajorVersionSpec(): PackageVersionSpec | undefined {
    if (['patch', 'minor', 'upToDate'].includes(this.lastVersionStatus)) {
      return;
    }

    return this.getSpec(this.lastVersion);
  }

  private getRegistrySource(): PackageSpec['registrySource'] {
    try {
      const resolvedUrl = this.npmListDepItem?.resolved;

      if (!resolvedUrl) {
        return;
      }

      // Handle different package source types
      if (isNpmRegistryUrl(resolvedUrl)) {
        // Standard npm registry URL
        // Format: https://registry.npmjs.org/package-name/-/package-name-1.0.0.tgz
        const packagePath = resolvedUrl.split('/-/')[0];

        return packagePath;
      } else if (resolvedUrl.startsWith('https://') || resolvedUrl.startsWith('http://')) {
        // Other HTTP/HTTPS URLs (custom registries, tarballs, etc.)
        if (
          resolvedUrl.includes('github.com') ||
          resolvedUrl.includes('gitlab.com') ||
          resolvedUrl.includes('bitbucket.org')
        ) {
          // Git repository URLs
          return resolvedUrl.split('#')[0]; // Remove commit/branch reference
        } else {
          // Try to extract the package URL without version/tarball specifics
          const url = new URL(resolvedUrl);

          const pathParts = url.pathname.split('/-/');

          if (pathParts.length > 1) {
            // Registry URL with package path
            return `${url.origin}${pathParts[0]}`;
          } else {
            // Other HTTP URL
            return resolvedUrl;
          }
        }
      } else if (resolvedUrl.startsWith('git+')) {
        // Git URLs: git+https://, git+ssh://, etc.
        const gitUrl = resolvedUrl.substring(4).split('#')[0]; // Remove git+ prefix and fragment

        return gitUrl;
      } else if (resolvedUrl.startsWith('file:')) {
        // Local file references
        return resolvedUrl;
      } else if (resolvedUrl.startsWith('npm:')) {
        // npm alias packages
        const aliasedPackage = resolvedUrl.substring(4).split('@')[0];

        return `https://${NPM_REGISTRY_HOST}/${aliasedPackage}`;
      } else {
        // Any other format
        return resolvedUrl;
      }
    } catch (error) {
      this.ctx.outputService.error(error as Error);

      // Fallback to the original behavior
      return this.npmListDepItem?.resolved;
    }
  }

  private getLastVersion(): string {
    // First try to get the production version
    let lastVersion: string | undefined = this.npmRegistryData['dist-tags'].latest;

    // If no production version, get the last numeric version
    if (!lastVersion) {
      const productionVersions = this.filterProductionVersions(this.npmRegistryData.versions);

      // Sort versions by semver
      lastVersion = productionVersions.sort(this.compareSemverVersions).pop();
    }

    // If no numeric version found, get the latest version by publication date (may be a pre-release)
    if (!lastVersion) {
      const allVersions = Object.keys(this.npmRegistryData.versions);

      lastVersion = allVersions
        .sort((a, b) => {
          const aTime = this.npmRegistryData.time?.[a];

          const bTime = this.npmRegistryData.time?.[b];

          if (aTime && bTime) {
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          }

          return 0;
        })
        .pop();
    }

    return lastVersion as string;
  }

  private getLastVersionStatus(): PackageStatus {
    const installedVersion = this.getInstalledVersion();

    const lastVersion = this.lastVersion;

    if (installedVersion === lastVersion) {
      return 'upToDate';
    }

    const [iMajor, iMinor] = this.splitSemver(this.parseBaseVersion(installedVersion));

    const [pMajor, pMinor] = this.splitSemver(this.parseBaseVersion(lastVersion));

    if (iMajor !== pMajor) {
      return 'major';
    } else if (iMinor !== pMinor) {
      return 'minor';
    } else {
      return 'patch';
    }
  }

  private getSpec(version: string): PackageVersionSpec {
    const releaseDate = this.getReleaseDate(version);

    return {
      version,
      releaseDate: formatDate(releaseDate),
      npmUrl: getNpmPackageUrl(this.packageName, version),
      deprecated: this.isVersionDeprecated(version),
      timeSinceRelease: calculateTimeSinceRelease(releaseDate, this.timeUnit),
      timeUnit: this.timeUnit,
    };
  }

  private getInstalledVersion(): string {
    return this.npmListDepItem.version || '';
  }

  private getReleaseDate(version: string): string {
    return this.npmRegistryData?.time?.[version] || '';
  }

  private splitSemver(version: string): number[] {
    return version.split('.').map(Number);
  }

  private isVersionDeprecated(version: string): boolean | undefined {
    if (!this.npmRegistryData) {
      return;
    }

    // Check if the specific version is deprecated in the versions object
    const versionData = this.npmRegistryData.versions[version];

    if (versionData && typeof versionData === 'object' && 'deprecated' in versionData) {
      return !!versionData.deprecated;
    }

    return false;
  }

  /**
   * Helper function to check if a version is a pre-release version
   * @param version The version string to check
   * @returns True if the version contains pre-release identifiers (contains '-')
   */
  private isPreReleaseVersion(version: string): boolean {
    return version.includes('-');
  }

  /**
   * Helper function to extract the base version from a pre-release version
   * @param version The version string (e.g., "5.0.0-beta.26")
   * @returns The base version without pre-release identifiers (e.g., "5.0.0")
   */
  private parseBaseVersion(version: string): string {
    return version.split('-')[0];
  }

  /**
   * Helper function to compare semantic versions
   * @param a First version string (e.g., "1.2.3")
   * @param b Second version string (e.g., "1.2.4")
   * @returns Comparison result (-1, 0, 1)
   */
  private compareSemverVersions = (a: string, b: string): number => {
    const [aMajor, aMinor, aPatch] = this.splitSemver(a);

    const [bMajor, bMinor, bPatch] = this.splitSemver(b);

    if (aMajor !== bMajor) return aMajor - bMajor;

    if (aMinor !== bMinor) return aMinor - bMinor;

    return aPatch - bPatch;
  };

  /**
   * Finds newer pre-release versions in the same base version range as the installed version.
   * Uses publication dates for reliable sorting regardless of pre-release tag format.
   *
   * @param installedVersion The currently installed pre-release version
   * @returns The latest pre-release version in the same range, or undefined if none found
   */
  private findNewerPreReleaseInSameRange(installedVersion: string): string | undefined {
    const baseVersion = this.parseBaseVersion(installedVersion);

    const allVersions = Object.keys(this.npmRegistryData.versions);

    // Find newer pre-releases in the same major.minor.patch range
    const newerPreReleases = allVersions
      .filter((version) => {
        // Only consider pre-release versions
        if (!this.isPreReleaseVersion(version)) return false;

        // Only same base version (e.g., 5.0.0-beta.26 → 5.0.0-beta.29)
        return this.parseBaseVersion(version) === baseVersion;
      })
      .filter((version) => {
        // Only versions newer than installed (by publication date)
        const installedTime = this.npmRegistryData?.time?.[installedVersion];

        const versionTime = this.npmRegistryData?.time?.[version];

        if (installedTime && versionTime) {
          return new Date(versionTime).getTime() > new Date(installedTime).getTime();
        }

        // Fallback to lexical comparison if no timestamps
        return version > installedVersion;
      })
      .sort((a, b) => {
        // Sort by publication date
        const aTime = this.npmRegistryData?.time?.[a];

        const bTime = this.npmRegistryData?.time?.[b];

        if (aTime && bTime) {
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        }

        // Fallback to lexical sort
        return a.localeCompare(b);
      });

    return newerPreReleases.pop(); // Get the latest
  }

  private filterProductionVersions(versions: NpmRegistryPackageData['versions']) {
    // Extract version keys from the versions object
    return Object.keys(versions).filter((version: string) => !this.isPreReleaseVersion(version));
  }
}

export default PackageInfoService;
