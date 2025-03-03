type GenericObject<T extends Record<string, unknown>> = Record<string, unknown> & T;

export type PackageStatus = 'upToDate' | 'major' | 'minor' | 'patch';

export type PackageSpec = {
  packageName: string;
  depType: string;
  curVersion: string;
  installedVersion?: string;
  installedVersionReleaseDate?: string;
  lastMinorVersion?: string;
  lastMinorVersionReleaseDate?: string;
  latestVersion?: string;
  latestVersionReleaseDate?: string;
  source?: string;
  packageStatus?: PackageStatus;
  deprecated?: boolean;
};

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

// npm view <packagename> --json
export type NpmViewData = GenericObject<{
  versions: string[];
  time: Record<string, string>;
  homepage: string;
  repository: string | GenericObject<{ url: string }>;
  deprecated?: boolean;
}>;

export type SummaryStats = Record<PackageStatus | 'total' | 'deprecated', number>;

export type Summary = Record<string, SummaryStats>;
