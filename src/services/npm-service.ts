import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import { Dependencies, InstalledVersionsAndSources, VersionInfo } from '@/utils/types';

class NpmService {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
  }

  public getInstalledVersionsAndSources(
    dependencies: Dependencies,
    devDependencies: Dependencies,
    peerDependencies: Dependencies
  ): InstalledVersionsAndSources {
    try {
      let result;
      if (fs.existsSync(path.resolve(this.cwd, 'package-lock.json'))) {
        result = execSync(`npm list --json`, { cwd: this.cwd });
      } else if (fs.existsSync(path.resolve(this.cwd, 'yarn.lock'))) {
        result = execSync(`yarn list --json`, { cwd: this.cwd });
      } else if (fs.existsSync(path.resolve(this.cwd, 'pnpm-lock.yaml'))) {
        result = execSync(`pnpm list --json`, { cwd: this.cwd });
      } else {
        throw new Error('No lock file found. Please use npm, yarn, or pnpm.');
      }

      const jsonResult = JSON.parse(result.toString());
      const installedVersionsAndSources: InstalledVersionsAndSources = {};

      const extractVersionsAndSources = (deps: Record<string, any>, depType: Dependencies) => {
        for (const [name, info] of Object.entries(deps)) {
          const version = info.version;
          const source = this.determineSource(depType[name]);
          installedVersionsAndSources[name] = { version, source };
          if (info.dependencies) {
            extractVersionsAndSources(info.dependencies, depType);
          }
        }
      };

      extractVersionsAndSources(jsonResult.dependencies, dependencies);
      extractVersionsAndSources(jsonResult.dependencies, devDependencies);
      extractVersionsAndSources(jsonResult.dependencies, peerDependencies);
      return installedVersionsAndSources;
    } catch {
      return {};
    }
  }

  public getLastMinorAndLatestVersion(packageName: string, installedVersion: string): VersionInfo {
    try {
      const result = execSync(`npm view ${packageName} versions --json`, { cwd: this.cwd });
      const versions = JSON.parse(result.toString());
      const [major, minor] = installedVersion.split('.').map(Number);
      const productionVersions = versions.filter((version: string) => !version.includes('-'));

      const lastMinorVersion = productionVersions
        .filter((version: string) => {
          const [vMajor, vMinor] = version.split('.').map(Number);
          return vMajor === major && vMinor > minor;
        })
        .sort((a: string, b: string) => {
          const [aMajor, aMinor, aPatch] = a.split('.').map(Number);
          const [bMajor, bMinor, bPatch] = b.split('.').map(Number);
          if (aMajor !== bMajor) return aMajor - bMajor;
          if (aMinor !== bMinor) return aMinor - bMinor;
          return aPatch - bPatch;
        })
        .pop();

      const latestVersion = productionVersions.pop();

      return {
        lastMinorVersion: lastMinorVersion || null,
        latestVersion: latestVersion || null,
      };
    } catch {
      return { lastMinorVersion: null, latestVersion: null };
    }
  }

  private determineSource(dependency: string): string {
    if (
      dependency.startsWith('http') ||
      dependency.startsWith('git+http') ||
      dependency.startsWith('git+ssh')
    ) {
      return dependency;
    } else if (dependency.startsWith('github:')) {
      return `https://github.com/${dependency.slice(7)}`;
    } else if (dependency.startsWith('gitlab:')) {
      return `https://gitlab/${dependency.slice(7)}`;
    } else if (dependency.startsWith('bitbucket:')) {
      return `https://bitbucket.org/${dependency.slice(10)}`;
    } else {
      return 'https://registry.npmjs.org';
    }
  }
}

export default NpmService;
