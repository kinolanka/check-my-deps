import { Dependencies } from '@/utils/types';
import fs from 'fs-extra';
import path from 'path';
import { PackageJson } from 'type-fest';

class PackageFileService {
  private packageFileName = 'package.json';

  private cwd: string;

  private packageJson: PackageJson;

  constructor(cwd: string) {
    this.cwd = cwd;

    const packageJsonPath = path.resolve(this.cwd, this.packageFileName);

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
