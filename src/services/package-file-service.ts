import { Dependencies } from '@/utils/types';
import fs from 'fs-extra';
import path from 'path';
import { PackageJson } from 'type-fest';

import Service, { ServiceType } from '@/services/service';

class PackageFileService extends Service {
  private packageFileName = 'package.json';

  private packageJson: PackageJson;

  constructor(ctx: ServiceType) {
    super(ctx);

    const packageJsonPath = path.resolve(this.ctx.cwd, this.packageFileName);

    this.packageJson = fs.readJSONSync(packageJsonPath) as PackageJson;
  }

  public getName(): string {
    return this.packageJson.name || '';
  }

  public getDeps(type: string): Dependencies {
    return this.packageJson[type] as Dependencies;
  }
}

export default PackageFileService;
