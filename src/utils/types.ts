export type Dependencies = Record<string, string>;

export type InstalledVersionsAndSources = Record<string, { version: string; source: string }>;

export type VersionInfo = {
  lastMinorVersion: string | null;
  latestVersion: string | null;
};
