type GenericObject<T extends Record<string, unknown>> = Record<string, unknown> & T;

export type PackageSpec = {
  packageName: string;
  depType: string;
  curVersion: string;
  installedVersion?: string;
  lastMinorVersion?: string;
  latestVersion?: string;
  source?: string;
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
}>;
