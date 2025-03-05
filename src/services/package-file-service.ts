import fs from 'fs-extra';
import path from 'path';
import { PackageJson } from 'type-fest';

import Service, { ServiceType } from '@/services/service';
import sanitizeFileName from '@/utils/helpers/sanitize-file-name';
import { PackageSpec } from '@/utils/types';

class PackageFileService extends Service {
  private packageFileName = 'package.json';

  private depsTypes = ['dependencies', 'devDependencies', 'peerDependencies'];

  private packageJson: PackageJson;

  constructor(ctx: ServiceType) {
    super(ctx);

    const packageJsonPath = path.resolve(this.ctx.cwd, this.packageFileName);

    this.packageJson = fs.readJSONSync(packageJsonPath) as PackageJson;
  }

  public getName(): string {
    return this.packageJson.name || '';
  }

  public getVersion(): string {
    return this.packageJson.version || '0.0.0';
  }

  public getPackages(): PackageSpec[] {
    const list: PackageSpec[] = [];

    for (const depType of this.depsTypes) {
      const deps = this.packageJson[depType];

      if (deps) {
        for (const [packageName, versionRequired] of Object.entries(deps)) {
          list.push({
            packageName,
            dependencyType: depType,
            versionRequired,
          });
        }
      }
    }

    return list;
  }

  public getExportFilePath(): string {
    const packageName = sanitizeFileName(this.getName() || 'package');
    // Replace dots in version with hyphens for better cross-OS compatibility
    const version = this.getVersion().replace(/\./g, '-');

    const filePath = path.resolve(this.ctx.cwd, `${packageName}-v${version}-dependencies`);

    return filePath;
  }
}

export default PackageFileService;
