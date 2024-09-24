import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

import Service, { ServiceType } from '@/services/service';
import PackageFileService from '@/services/package-file-service';
import { Dependencies, InstalledVersionsAndSources, PackageData, VersionInfo } from '@/utils/types';

class NpmService extends Service {
  private packageFileService: PackageFileService;

  private depsKeys = ['dependencies', 'devDependencies', 'peerDependencies'];

  private list: PackageData[] | null = null;

  constructor(packageFileService: PackageFileService, ctx: ServiceType) {
    super(ctx);

    this.packageFileService = packageFileService;
  }

  private _setDependenciesList() {
    const list = [];

    for (const key of this.depsKeys) {
      const deps = this.packageFileService.getDeps(key);

      if (deps) {
        for (const [name, version] of Object.entries(deps)) {
          list.push({
            packageName: name,
            type: key,
            curVersion: version,
            installedVersion: '',
            lastMinorVersion: '',
            latestVersion: '',
            source: '',
          });
        }
      }
    }

    this.list = list;
  }

  public init() {
    this._setDependenciesList();
  }

  public getList(): PackageData[] {
    if (!this.list) {
      throw new Error('You must call init() before calling getList()');
    }

    return this.list;
  }

  public getInstalledVersionsAndSources(
    dependencies: Dependencies,
    devDependencies: Dependencies,
    peerDependencies: Dependencies
  ): InstalledVersionsAndSources {
    try {
      let result;
      if (fs.existsSync(path.resolve(this.ctx.cwd, 'package-lock.json'))) {
        this.ctx.outputService.msg('Found package-lock.json');

        result = execSync(`npm list --json`, { cwd: this.ctx.cwd });
      } else if (fs.existsSync(path.resolve(this.ctx.cwd, 'yarn.lock'))) {
        this.ctx.outputService.msg('Found yarn.lock');

        result = execSync(`yarn list --json`, { cwd: this.ctx.cwd });
      } else if (fs.existsSync(path.resolve(this.ctx.cwd, 'pnpm-lock.yaml'))) {
        this.ctx.outputService.msg('Found pnpm-lock.yaml');

        result = execSync(`pnpm list --json`, { cwd: this.ctx.cwd });
      } else {
        this.ctx.outputService.errorMsg('No lock file found. Please use npm, yarn, or pnpm.');

        throw new Error();
      }

      const jsonResult = JSON.parse(result.toString());

      const installedVersionsAndSources: InstalledVersionsAndSources = {};

      this._extractVersionsAndSources(
        jsonResult.dependencies,
        dependencies,
        installedVersionsAndSources
      );
      this._extractVersionsAndSources(
        jsonResult.dependencies,
        devDependencies,
        installedVersionsAndSources
      );
      this._extractVersionsAndSources(
        jsonResult.dependencies,
        peerDependencies,
        installedVersionsAndSources
      );

      return installedVersionsAndSources;
    } catch (err) {
      this.ctx.outputService.error(err as Error);

      return {};
    }
  }

  public getLastMinorAndLatestVersion(packageName: string, installedVersion: string): VersionInfo {
    try {
      const result = execSync(`npm view ${packageName} versions --json`, { cwd: this.ctx.cwd });
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

  private _extractVersionsAndSources = (
    deps: Record<string, any>,
    depType: Dependencies,
    installedVersionsAndSources: InstalledVersionsAndSources
  ) => {
    for (const [name, info] of Object.entries(deps)) {
      const version = info.version;

      const source = this._determineSource(depType[name]);

      installedVersionsAndSources[name] = { version, source };

      if (info.dependencies) {
        this._extractVersionsAndSources(info.dependencies, depType, installedVersionsAndSources);
      }
    }
  };

  private _determineSource(dependency: string): string {
    if (!dependency) {
      return 'https://registry.npmjs.org';
    }

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
