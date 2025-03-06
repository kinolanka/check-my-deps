type GenericObject<T extends Record<string, unknown>> = Record<string, unknown> & T;

export type PackageStatus = 'upToDate' | 'major' | 'minor' | 'patch';

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
  versions: string[] & Record<string, { deprecated?: string | boolean }>;
  time: Record<string, string>;
  homepage: string;
  repository: string | GenericObject<{ url: string }>;
  deprecated?: boolean | string;
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
