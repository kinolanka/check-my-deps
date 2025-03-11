/**
 * @fileoverview Defines TypeScript type definitions used throughout the check-my-deps package.
 *
 * This module contains all shared type definitions that represent the core data structures
 * of the application, including:
 * - Package information and version specifications
 * - npm API response structures
 * - Summary and reporting data structures
 * - Export format options
 * - Status indicators for dependency updates
 *
 * These types provide strong typing for the application, ensuring consistency
 * across services and reducing potential runtime errors through compile-time checks.
 * They also serve as documentation for the shape of data flowing through the system.
 */

/**
 * Common types
 */

export type GenericObject<T extends Record<string, unknown>> = Record<string, unknown> & T;

export type PackageVersionSpec = {
  version: string;
  releaseDate: string;
  npmUrl: string;
  deprecated?: boolean;
};

export type PackageSpec = {
  packageName: string;
  dependencyType: string;
  registrySource?: string;
  updateStatus?: PackageStatus;
  deprecated?: boolean;
  versionRequired: string;
  versionInstalled?: PackageVersionSpec;
  versionLastMinor?: PackageVersionSpec;
  versionLast?: PackageVersionSpec;
};

export type PackageStatus = 'upToDate' | 'major' | 'minor' | 'patch';

export type NpmListDepItem = GenericObject<{
  version: string;
  resolved: string;
}>;

// npm list --json
export type NpmListData = GenericObject<{
  name: string;
  version: string;
  dependencies: Record<string, NpmListDepItem>;
}>;

// Direct npm registry API response type
export type NpmRegistryPackageData = GenericObject<{
  name: string;
  description?: string;
  'dist-tags': Record<string, string>;
  versions: GenericObject<{
    version: string;
    deprecated?: string | boolean;
    description?: string;
    homepage?: string;
    repository?: string | { type: string; url: string };
  }>;
  time: Record<string, string>;
  homepage?: string;
  repository?: string | { type: string; url: string };
  deprecated?: string | boolean;
}>;

/**
 * Export command specific types
 */

export type ExportFormat = 'excel' | 'json';

export type SummaryStats = Record<PackageStatus | 'total' | 'deprecated', number>;

export type SummaryTotals = SummaryStats & {
  outdated: number; // Sum of major, minor, and patch
};

export type ReportInfo = {
  date: string;
  time: string;
  projectName: string;
  projectVersion: string;
};

export type Summary = {
  byType: Record<string, SummaryStats>;
  totals: SummaryTotals;
  reportInfo: ReportInfo;
  sourceInfo?: {
    info: string;
    urls: Array<{ label: string; url: string }>;
  };
};

/**
 * Update command specific types
 */

export type UpdateLevel = 'latest' | 'minor' | 'patch';

export type PackageUpdateInfo = {
  packageName: string;
  dependencyType: string;
  currentVersion: string;
  newVersion: string;
  updateType: PackageStatus;
  deprecated?: boolean;
};
