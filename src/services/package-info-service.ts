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
  private npmListDepItem?: NpmListDepItem;

  private npmRegistryData?: NpmRegistryPackageData;

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
      npmListDepItem?: NpmListDepItem;
      npmRegistryData?: NpmRegistryPackageData;
    },
    ctx: ServiceCtxType
  ) {
    super(ctx);

    this.npmListDepItem = args.npmListDepItem;

    this.npmRegistryData = args.npmRegistryData;

    this.packageName = args.package.packageName;

    this.dependencyType = args.package.dependencyType;

    this.versionRequired = args.package.versionRequired;

    this.versionInstalled = this.getInstalledVersionSpec();

    this.versionLastPatch = this.getLastPatchVersionSpec();

    this.versionLastMinor = this.getLastMinorVersionSpec();

    this.versionLastMajor = this.getLastMajorVersionSpec();

    this.registrySource = this.getRegistrySource();

    this.updateStatus = this.getPackageStatus();
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

  private getInstalledVersionSpec(): PackageVersionSpec | undefined {
    const installedVersion = this.getInstalledVersion();

    if (installedVersion) {
      const releaseDate = this.getReleaseDate(installedVersion);

      return {
        version: installedVersion,
        releaseDate: formatDate(releaseDate),
        npmUrl: getNpmPackageUrl(this.packageName, installedVersion),
        deprecated: this.isVersionDeprecated(installedVersion),
        timeSinceRelease: calculateTimeSinceRelease(releaseDate, this.timeUnit),
        timeUnit: this.timeUnit,
      };
    }
  }

  private getLastPatchVersionSpec(): PackageVersionSpec | undefined {
    const installedVersion = this.getInstalledVersion();

    if (!installedVersion || !this.npmRegistryData) {
      return;
    }

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
    const installedVersion = this.getInstalledVersion();

    if (!installedVersion || !this.npmRegistryData) {
      return;
    }

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

  /**
   * Sets the latest production version using npm's dist-tags.latest as the authoritative source.
   * Falls back to numerically highest production version if dist-tags.latest is unavailable or invalid.
   *
   * This approach ensures we get the actual latest production version as intended by package
   * maintainers, rather than potentially mistaken high version numbers (e.g., nx@9999.0.1).
   *
   * Pre-release versions are handled in setLastPatchVersion() for same-base-version updates.
   */
  private getLastMajorVersionSpec(): PackageVersionSpec | undefined {
    if (!this.npmRegistryData) {
      return;
    }

    let latestVersion: PackageVersionSpec['version'] | undefined;

    // First, try to use the dist-tags.latest as the authoritative latest version
    if (this.npmRegistryData['dist-tags']?.latest) {
      const distTagLatest = this.npmRegistryData['dist-tags'].latest;

      // Ensure the dist-tags.latest version is a production version (not pre-release)
      if (!this.isPreReleaseVersion(distTagLatest)) {
        // Verify the version exists in the versions object
        if (this.npmRegistryData.versions[distTagLatest]) {
          latestVersion = distTagLatest;
        }
      }
    }

    // Fallback to numeric sorting if dist-tags.latest is not available or invalid
    if (!latestVersion) {
      const productionVersions = this.filterProductionVersions(this.npmRegistryData.versions);

      // Sort versions by semver
      latestVersion = productionVersions.sort(this.compareSemverVersions).pop();
    }

    // Set the versionLastMajor property
    if (latestVersion) {
      return this.getSpec(latestVersion);
    }
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

  /**
   * Sets the package update status by comparing installed version with the most relevant update.
   * For pre-release installations, prioritizes comparison with newer pre-releases in the same range
   * (found in versionLastPatch), falling back to production versions (versionLastMajor) when appropriate.
   *
   * TODO: Future enhancement - consider dedicated pre-release status types for more
   * granular beta/alpha update information
   */
  private getPackageStatus(): PackageSpec['updateStatus'] {
    const installedVersion = this.getInstalledVersion();

    if (!installedVersion || !this.versionInstalled?.version) {
      return;
    }

    const installedIsPreRelease = this.isPreReleaseVersion(installedVersion);

    // Determine the most relevant comparison version
    let comparisonVersion: string | undefined;

    // For pre-release installations, prioritize versionLastPatch if it exists and is a pre-release update
    if (installedIsPreRelease && this.versionLastPatch?.version) {
      const patchVersion = this.versionLastPatch.version;

      const installedBase = this.parseBaseVersion(installedVersion);

      const patchBase = this.parseBaseVersion(patchVersion);

      // If patch is a pre-release in the same base version range, use it for comparison
      if (this.isPreReleaseVersion(patchVersion) && installedBase === patchBase) {
        comparisonVersion = patchVersion;
      }
    }

    // Fall back to versionLastMajor (production version) if no relevant pre-release patch found
    if (!comparisonVersion && this.versionLastMajor?.version) {
      comparisonVersion = this.versionLastMajor.version;
    }

    // If no comparison version available, we can't determine status
    if (!comparisonVersion) {
      return;
    }

    // Check if both are the same version (including pre-release identifiers)
    if (installedVersion === comparisonVersion) {
      return 'upToDate';
    }

    // For pre-release comparisons, use base versions for semantic comparison
    const comparisonIsPreRelease = this.isPreReleaseVersion(comparisonVersion);

    let installedBase: string;

    let comparisonBase: string;

    if (installedIsPreRelease) {
      installedBase = this.parseBaseVersion(installedVersion);
    } else {
      installedBase = installedVersion;
    }

    if (comparisonIsPreRelease) {
      comparisonBase = this.parseBaseVersion(comparisonVersion);
    } else {
      comparisonBase = comparisonVersion;
    }

    // If both have the same base version, treat as patch-level update
    if (installedBase === comparisonBase) {
      return 'patch';
    }

    // Compare base versions using semver logic
    const [installedMajor, installedMinor] = this.splitSemver(installedBase);

    const [comparisonMajor, comparisonMinor] = this.splitSemver(comparisonBase);

    if (installedMajor === comparisonMajor && installedMinor === comparisonMinor) {
      return 'patch';
    } else if (installedMajor === comparisonMajor) {
      return 'minor';
    } else {
      return 'major';
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
    return this.npmListDepItem?.version || '';
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
    if (!this.npmRegistryData) {
      return;
    }

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
