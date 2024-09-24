export type Dependencies = Record<string, string>;

export type InstalledVersionsAndSources = Record<string, { version: string; source: string }>;

export type VersionInfo = {
  lastMinorVersion: string | null;
  latestVersion: string | null;
};

export type PackageData = {
  packageName: string;
  type: string;
  curVersion: string;
  installedVersion: string;
  lastMinorVersion: string;
  latestVersion: string;
  source: string;
};
