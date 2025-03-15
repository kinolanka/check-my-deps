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
  PackageVersionSpec,
  TimeUnit,
} from '@/utils/types';

class PackageInfoService extends Service {
  private packageName: string;

  private dependencyType: string;

  private versionRequired: string;

  private versionInstalled?: PackageVersionSpec;

  private versionLastPatch?: PackageVersionSpec;

  private versionLastMinor?: PackageVersionSpec;

  private versionLast?: PackageVersionSpec;

  private registrySource?: string;

  private updateStatus?: PackageSpec['updateStatus'];

  private npmListDepItem?: NpmListDepItem;

  private npmRegistryData?: NpmRegistryPackageData;

  private timeUnit: TimeUnit = 'months'; // Default time unit

  constructor(
    args: {
      package: PackageSpec;
      npmListDepItem?: NpmListDepItem;
      npmRegistryData?: NpmRegistryPackageData;
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

    this.setLastPatchVersion();

    this.setLastMinorVersion();

    this.setLatestVersion();

    this.setRegistrySource();

    this.setPackageStatus();
  }

  /**
   * Gets the package specification
   * @returns The package specification object
   */
  public getSpec(): PackageSpec {
    return this.getInfo();
  }

  /**
   * Gets the package information
   * @returns The package information object
   */
  public getInfo(): PackageSpec {
    const packageSpec: PackageSpec = {
      packageName: this.packageName,
      dependencyType: this.dependencyType,
      versionRequired: this.versionRequired,
      versionInstalled: this.versionInstalled,
      versionLastPatch: this.versionLastPatch,
      versionLastMinor: this.versionLastMinor,
      registrySource: this.registrySource,
      updateStatus: this.updateStatus,
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

    // Check if last patch version is the same as latest version
    const isLastPatchSameAsLast =
      this.versionLastPatch?.version &&
      this.versionLast?.version &&
      this.versionLastPatch.version === this.versionLast.version;

    // Only include versionLast if it's different from both versionInstalled, versionLastMinor, AND versionLastPatch
    if (!isSameVersion && !isLastMinorSameAsLast && !isLastPatchSameAsLast) {
      packageSpec.versionLast = this.versionLast;
    }

    return packageSpec;
  }

  /**
   * Sets the time unit for time since release calculations
   * @param unit The time unit to use ('days', 'months', or 'years')
   */
  public setTimeUnit(unit: TimeUnit): void {
    this.timeUnit = unit;

    // Recalculate time since release for all versions with the new unit
    this.updateTimeSinceRelease();
  }

  /**
   * Updates the time since release values for all versions based on the current time unit
   */
  private updateTimeSinceRelease(): void {
    // Update installed version
    if (this.versionInstalled) {
      const releaseDate = this.npmRegistryData?.time?.[this.versionInstalled.version] || '';

      this.versionInstalled.timeSinceRelease = calculateTimeSinceRelease(
        releaseDate,
        this.timeUnit
      );

      this.versionInstalled.timeUnit = this.timeUnit;
    }

    // Update latest patch version
    if (this.versionLastPatch) {
      const releaseDate = this.npmRegistryData?.time?.[this.versionLastPatch.version] || '';

      this.versionLastPatch.timeSinceRelease = calculateTimeSinceRelease(
        releaseDate,
        this.timeUnit
      );

      this.versionLastPatch.timeUnit = this.timeUnit;
    }

    // Update latest minor version
    if (this.versionLastMinor) {
      const releaseDate = this.npmRegistryData?.time?.[this.versionLastMinor.version] || '';

      this.versionLastMinor.timeSinceRelease = calculateTimeSinceRelease(
        releaseDate,
        this.timeUnit
      );

      this.versionLastMinor.timeUnit = this.timeUnit;
    }

    // Update latest version
    if (this.versionLast) {
      const releaseDate = this.npmRegistryData?.time?.[this.versionLast.version] || '';

      this.versionLast.timeSinceRelease = calculateTimeSinceRelease(releaseDate, this.timeUnit);

      this.versionLast.timeUnit = this.timeUnit;
    }
  }

  private setInstalledVersion() {
    const installedVersion = this.npmListDepItem?.version || '';

    if (installedVersion) {
      const releaseDate = this.npmRegistryData?.time?.[installedVersion] || '';

      this.versionInstalled = {
        version: installedVersion,
        releaseDate: formatDate(releaseDate),
        npmUrl: getNpmPackageUrl(this.packageName, installedVersion),
        deprecated: this.isVersionDeprecated(installedVersion),

        timeSinceRelease: calculateTimeSinceRelease(releaseDate, this.timeUnit),
        timeUnit: this.timeUnit,
      };
    }
  }

  private setLastPatchVersion() {
    if (!this.versionInstalled?.version || !this.npmRegistryData) {
      return;
    }

    const productionVersions = this.filterProductionVersions(this.npmRegistryData.versions);

    // Extract major, minor, and patch version numbers from installed version
    const [major, minor, patch] = this.versionInstalled.version.split('.').map(Number);

    // Find the latest patch version that is greater than the installed patch version
    const lastPatchVersion = productionVersions
      // filter versions that match the installed major and minor versions and have a greater patch version
      .filter((version: string) => {
        const [vMajor, vMinor, vPatch] = version.split('.').map(Number);

        return vMajor === major && vMinor === minor && vPatch > patch;
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

    if (lastPatchVersion) {
      const releaseDate = this.npmRegistryData.time?.[lastPatchVersion] || '';

      this.versionLastPatch = {
        version: lastPatchVersion,
        releaseDate: formatDate(releaseDate),
        npmUrl: getNpmPackageUrl(this.packageName, lastPatchVersion),
        deprecated: this.isVersionDeprecated(lastPatchVersion),

        timeSinceRelease: calculateTimeSinceRelease(releaseDate, this.timeUnit),
        timeUnit: this.timeUnit,
      };
    }
  }

  private setLastMinorVersion() {
    if (!this.versionInstalled?.version || !this.npmRegistryData) {
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
      const releaseDate = this.npmRegistryData.time?.[lastMinorVersion] || '';

      this.versionLastMinor = {
        version: lastMinorVersion,
        releaseDate: formatDate(releaseDate),
        npmUrl: getNpmPackageUrl(this.packageName, lastMinorVersion),
        deprecated: this.isVersionDeprecated(lastMinorVersion),

        timeSinceRelease: calculateTimeSinceRelease(releaseDate, this.timeUnit),
        timeUnit: this.timeUnit,
      };
    }
  }

  private setLatestVersion() {
    if (!this.npmRegistryData) {
      return;
    }

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
      const releaseDate = this.npmRegistryData.time?.[latestVersion] || '';

      this.versionLast = {
        version: latestVersion,
        releaseDate: formatDate(releaseDate),
        npmUrl: getNpmPackageUrl(this.packageName, latestVersion),
        deprecated: this.isVersionDeprecated(latestVersion),

        timeSinceRelease: calculateTimeSinceRelease(releaseDate, this.timeUnit),
        timeUnit: this.timeUnit,
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
      if (isNpmRegistryUrl(resolvedUrl)) {
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

  private filterProductionVersions(versions: NpmRegistryPackageData['versions']) {
    // Extract version keys from the versions object
    return Object.keys(versions).filter((version: string) => !version.includes('-'));
  }
}

export default PackageInfoService;
