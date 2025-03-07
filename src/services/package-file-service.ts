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
    return this.packageJson.name ?? '';
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

  /**
   * Gets an export file path, either unique or overwriting existing files based on the forceOverwrite option
   * @param fileExtension The file extension to check for (including the dot, e.g., '.xlsx')
   * @param forceOverwrite If true, will return the base file path even if it already exists
   * @returns A file path without the extension
   */
  public getExportFilePath(fileExtension: string, forceOverwrite = false): string {
    const packageName = sanitizeFileName(this.getName() || 'package');
    // Replace dots in version with hyphens for better cross-OS compatibility
    const version = this.getVersion().replace(/\./g, '-');

    const baseFileName = `${packageName}-v${version}-dependencies`;
    const outputDir = this.ctx.outputDir ?? this.ctx.cwd;

    // If forceOverwrite is true, we don't need to check for existing files
    if (forceOverwrite) {
      return path.resolve(outputDir, baseFileName);
    }

    // Otherwise, get a unique file path by adding a numeric suffix if the file already exists
    const uniqueFilePath = this.getUniqueFilePath(outputDir, baseFileName, fileExtension);

    return uniqueFilePath;
  }

  /**
   * Generates a unique file path by adding a numeric suffix if the file already exists
   * @param outputDir The directory where the file will be saved
   * @param baseFileName The base file name without extension
   * @param fileExtension The file extension to check for (including the dot, e.g., '.xlsx')
   * @returns A unique file path that doesn't exist yet (without the extension)
   */
  private getUniqueFilePath(
    outputDir: string,
    baseFileName: string,
    fileExtension: string
  ): string {
    let suffix = '';
    let counter = 1;
    let filePath = path.resolve(outputDir, `${baseFileName}${suffix}`);
    let fullFilePath = `${filePath}${fileExtension}`;

    // Check if the file with the current suffix exists
    while (fs.existsSync(fullFilePath)) {
      // File exists, increment the counter and try again
      suffix = `-${counter}`;
      filePath = path.resolve(outputDir, `${baseFileName}${suffix}`);
      fullFilePath = `${filePath}${fileExtension}`;
      counter++;
    }

    return filePath;
  }
}

export default PackageFileService;
