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
  private packageName: PackageSpec['packageName'];

  private dependencyType: PackageSpec['dependencyType'];

  private versionRequired: PackageSpec['versionRequired'];

  private versionInstalled?: PackageVersionSpec;

  private versionLastPatch?: PackageVersionSpec;

  private versionLastMinor?: PackageVersionSpec;

  private versionLast?: PackageVersionSpec;

  private registrySource?: PackageSpec['registrySource'];

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
      .sort(this.compareSemverVersions)
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
      .sort(this.compareSemverVersions)
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

  /**
   * Sets the latest production version using npm's dist-tags.latest as the authoritative source.
   * Falls back to numerically highest version if dist-tags.latest is unavailable or invalid.
   *
   * TODO: Future enhancement - add separate status types for beta/alpha updates (betaUpdate,
   * alphaUpdate, rcUpdate, stableAvailable) to provide more granular pre-release information
   *
   * This approach ensures we get the actual latest production version as intended by package
   * maintainers, rather than potentially mistaken high version numbers (e.g., nx@9999.0.1).
   *
   * For pre-release versions, intelligently compares within the same major.minor range before
   * falling back to production versions.
   */
  private setLatestVersion() {
    if (!this.npmRegistryData) {
      return;
    }

    let latestVersion: PackageVersionSpec['version'] | undefined;

    // Check if installed version is a pre-release
    const installedVersion = this.versionInstalled?.version;

    const isInstalledPreRelease = installedVersion && this.isPreReleaseVersion(installedVersion);

    // Get the latest production version first
    let productionVersion: PackageVersionSpec['version'] | undefined;

    // First, try to use the dist-tags.latest as the authoritative latest version
    if (this.npmRegistryData['dist-tags']?.latest) {
      const distTagLatest = this.npmRegistryData['dist-tags'].latest;

      // Ensure the dist-tags.latest version is a production version (not pre-release)
      if (!this.isPreReleaseVersion(distTagLatest)) {
        // Verify the version exists in the versions object
        if (this.npmRegistryData.versions[distTagLatest]) {
          productionVersion = distTagLatest;
        }
      }
    }

    // Fallback to numeric sorting if dist-tags.latest is not available or invalid
    if (!productionVersion) {
      const productionVersions = this.filterProductionVersions(this.npmRegistryData.versions);

      // Sort versions by semver
      productionVersion = productionVersions.sort(this.compareSemverVersions).pop();
    }

    if (isInstalledPreRelease) {
      // For pre-release installations, look for newer pre-releases in the same major.minor range
      const baseVersion = this.parseBaseVersion(installedVersion);

      const allVersions = Object.keys(this.npmRegistryData.versions);

      const higherPreRelease = this.findHighestPreReleaseInRange(baseVersion, allVersions);

      // Only use the higher pre-release if it's actually higher than the installed version
      let usePreRelease = false;

      if (higherPreRelease && higherPreRelease !== installedVersion) {
        const higherBase = this.parseBaseVersion(higherPreRelease);

        const installedBase = this.parseBaseVersion(installedVersion);

        const [higherMajor, higherMinor, higherPatch] = higherBase.split('.').map(Number);

        const [installedMajor, installedMinor, installedPatch] = installedBase
          .split('.')
          .map(Number);

        // Check if the higher pre-release is actually higher
        if (
          higherMajor > installedMajor ||
          (higherMajor === installedMajor && higherMinor > installedMinor) ||
          (higherMajor === installedMajor &&
            higherMinor === installedMinor &&
            higherPatch > installedPatch) ||
          (higherBase === installedBase && higherPreRelease > installedVersion)
        ) {
          usePreRelease = true;
        }
      }

      if (usePreRelease && higherPreRelease && productionVersion) {
        // Compare pre-release base version with production version to decide which to use
        const preReleaseBase = this.parseBaseVersion(higherPreRelease);

        const [preMajor, preMinor, prePatch] = preReleaseBase.split('.').map(Number);

        const [prodMajor, prodMinor, prodPatch] = productionVersion.split('.').map(Number);

        // Use production version if it's higher than the pre-release base
        if (
          prodMajor > preMajor ||
          (prodMajor === preMajor && prodMinor > preMinor) ||
          (prodMajor === preMajor && prodMinor === preMinor && prodPatch > prePatch)
        ) {
          latestVersion = productionVersion;
        } else {
          latestVersion = higherPreRelease;
        }
      } else if (usePreRelease && higherPreRelease) {
        latestVersion = higherPreRelease;
      } else if (productionVersion) {
        latestVersion = productionVersion;
      }
    } else {
      // For production installations, use production version
      latestVersion = productionVersion;
    }

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

  /**
   * Sets the package update status by comparing installed version with latest version.
   * Enhanced to handle pre-release versions intelligently by comparing base versions
   * when both are pre-releases, or treating pre-release increments as patch-level updates.
   *
   * TODO: Future enhancement - consider dedicated pre-release status types for more
   * granular beta/alpha update information
   */
  private setPackageStatus() {
    if (!this.versionInstalled?.version || !this.versionLast?.version) {
      return;
    }

    const installedVersion = this.versionInstalled.version;

    const latestVersion = this.versionLast.version;

    // Check if both are the same version (including pre-release identifiers)
    if (installedVersion === latestVersion) {
      this.updateStatus = 'upToDate';

      return;
    }

    // For pre-release comparisons, use base versions for semantic comparison
    const installedIsPreRelease = this.isPreReleaseVersion(installedVersion);

    const latestIsPreRelease = this.isPreReleaseVersion(latestVersion);

    let installedBase: string;

    let latestBase: string;

    if (installedIsPreRelease) {
      installedBase = this.parseBaseVersion(installedVersion);
    } else {
      installedBase = installedVersion;
    }

    if (latestIsPreRelease) {
      latestBase = this.parseBaseVersion(latestVersion);
    } else {
      latestBase = latestVersion;
    }

    // If both have the same base version, treat as patch-level update
    if (installedBase === latestBase) {
      this.updateStatus = 'patch';

      return;
    }

    // Compare base versions using semver logic
    const [installedMajor, installedMinor] = installedBase.split('.').map(Number);

    const [latestMajor, latestMinor] = latestBase.split('.').map(Number);

    if (installedMajor === latestMajor && installedMinor === latestMinor) {
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
    const [aMajor, aMinor, aPatch] = a.split('.').map(Number);

    const [bMajor, bMinor, bPatch] = b.split('.').map(Number);

    if (aMajor !== bMajor) return aMajor - bMajor;

    if (aMinor !== bMinor) return aMinor - bMinor;

    return aPatch - bPatch;
  };

  /**
   * Helper function to properly compare pre-release identifiers
   * @param a First pre-release identifier (e.g., "beta.29")
   * @param b Second pre-release identifier (e.g., "beta.9")
   * @returns Comparison result (-1, 0, 1)
   */
  private comparePreReleaseIdentifiers(a: string, b: string): number {
    const aParts = a.split('.');

    const bParts = b.split('.');

    const maxLength = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < maxLength; i++) {
      const aPart = aParts[i] || '';

      const bPart = bParts[i] || '';

      // Try to parse as numbers
      const aNum = parseInt(aPart, 10);

      const bNum = parseInt(bPart, 10);

      // If both are numbers, compare numerically
      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum !== bNum) {
          return aNum - bNum;
        }
      } else {
        // Compare lexically if not both numbers
        const result = aPart.localeCompare(bPart);

        if (result !== 0) {
          return result;
        }
      }
    }

    return 0;
  }

  /**
   * Helper function to find the highest pre-release version in the same major.minor range
   * @param baseVersion The base version to match (e.g., "5.0.0")
   * @param allVersions All available versions
   * @returns The highest pre-release version in the same range, or undefined if none found
   */
  private findHighestPreReleaseInRange(
    baseVersion: string,
    allVersions: string[]
  ): string | undefined {
    const [major, minor] = baseVersion.split('.').map(Number);

    return allVersions
      .filter((version) => {
        // Only consider pre-release versions
        if (!this.isPreReleaseVersion(version)) return false;

        const versionBase = this.parseBaseVersion(version);

        const [vMajor, vMinor] = versionBase.split('.').map(Number);

        // Match same major.minor range AND must be newer than current base version
        if (vMajor !== major || vMinor !== minor) return false;

        // Include all versions in the same major.minor range
        return true;
      })
      .sort((a, b) => {
        // Sort by semver including pre-release identifiers
        const aBase = this.parseBaseVersion(a);

        const bBase = this.parseBaseVersion(b);

        const aPre = a.substring(aBase.length + 1); // Get pre-release part

        const bPre = b.substring(bBase.length + 1);

        // Compare base versions first
        const baseComparison = this.compareSemverVersions(aBase, bBase);

        if (baseComparison !== 0) return baseComparison;

        // For same base version, compare pre-release identifiers properly
        // Handle numeric parts in pre-release identifiers (e.g., beta.29 vs beta.9)
        return this.comparePreReleaseIdentifiers(aPre, bPre);
      })
      .pop(); // Get the highest version
  }

  private filterProductionVersions(versions: NpmRegistryPackageData['versions']) {
    // Extract version keys from the versions object
    return Object.keys(versions).filter((version: string) => !this.isPreReleaseVersion(version));
  }
}

export default PackageInfoService;
