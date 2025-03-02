import fs from 'fs-extra';
import path from 'path';
import { PackageJson } from 'type-fest';

import Service, { ServiceType } from '@/services/service';
import sanitizeFileName from '@/utils/helpers/sanitize-file-name';

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

  public getPackages() {
    const list = [];

    for (const depType of this.depsTypes) {
      const deps = this.packageJson[depType];

      if (deps) {
        for (const [packageName, curVersion] of Object.entries(deps)) {
          list.push({
            packageName,
            depType,
            curVersion,
          });
        }
      }
    }

    return list;
  }

  public getExportFilePath(): string {
    const packageName = sanitizeFileName(this.getName() || 'package');

    const filePath = path.resolve(this.ctx.cwd, `${packageName}-deps-check`);

    return filePath;
  }
}

export default PackageFileService;
