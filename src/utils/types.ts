type GenericObject<T extends Record<string, unknown>> = Record<string, unknown> & T;

export type PackageStatus = 'upToDate' | 'major' | 'minor' | 'patch';

export type PackageVersionSpec = {
  version: string;
  releaseDate: string;
  npmUrl: string;
};

export type PackageSpec = {
  packageName: string;
  // depType: string;
  dependencyType: string;
  // regSource?: string;
  registrySource?: string;
  updateStatus?: PackageStatus;
  deprecated?: boolean;
  // reqVersion: string;
  versionRequired: string;
  // installedVersion?: string;
  // installedVersionUrl?: string;
  // installDate?: string;
  versionInstalled?: PackageVersionSpec;
  // latestMinor?: string;
  // latestMinorUrl?: string;
  // latestMinorDate?: string;
  versionLastMinor?: PackageVersionSpec;
  // latestVersion?: string;
  // latestVersionUrl?: string;
  // latestVersionDate?: string;
  versionLast?: PackageVersionSpec;
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
