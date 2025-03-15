/**
 * @fileoverview Provides the PackageFileService class for interacting with package.json files.
 *
 * This module implements a service for reading and analyzing package.json files with features including:
 * - Extracting package metadata (name, version)
 * - Parsing dependencies from all dependency types (dependencies, devDependencies, etc.)
 * - Validating the existence of package-lock.json
 * - Generating unique export file paths for reports
 *
 * The service serves as the primary interface for accessing package information
 * and is used by other services to retrieve dependency specifications.
 */

import fs from 'fs';
import path from 'path';

import type { ServiceType } from '@/services/service';
import Service from '@/services/service';
import { PACKAGE_FILE_NAME, PACKAGE_LOCK_FILE_NAME } from '@/utils/constants';
import sanitizeFileName from '@/utils/helpers/sanitize-file-name';
import type { PackageSpec } from '@/utils/types';

import type { PackageJson } from 'type-fest';

class PackageFileService extends Service {
  private packageFileName = PACKAGE_FILE_NAME;

  private packageLockFileName = PACKAGE_LOCK_FILE_NAME;

  private depsTypes = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];

  private packageJson: PackageJson;

  constructor(ctx: ServiceType) {
    super(ctx);

    const packageJsonPath = path.resolve(this.ctx.cwd, this.packageFileName);

    // First check if package-lock.json exists
    this.checkPackageLockExists();

    // Read package.json
    this.packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
  }

  public getName(): string {
    return this.packageJson.name ?? '';
  }

  public getVersion(): string {
    return this.packageJson.version || '0.0.0';
  }

  /**
   * Returns a list of all dependencies from package.json
   * @returns An array of PackageSpec objects containing package name, dependency type, and required version
   */
  public getPackages(): PackageSpec[] {
    const list: PackageSpec[] = [];

    // Iterate over all dependency types (dependencies, devDependencies, peerDependencies, optionalDependencies)
    for (const depType of this.depsTypes) {
      const deps = this.packageJson[depType];

      if (deps) {
        for (const [packageName, versionRequired] of Object.entries(deps)) {
          list.push({
            packageName,
            dependencyType: depType,
            versionRequired: versionRequired as string,
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
    // First check if the base file exists
    const filePath = path.resolve(outputDir, baseFileName);

    const fullFilePath = `${filePath}${fileExtension}`;

    // Define the regex to match files with numeric suffixes
    const fileRegex = new RegExp(`^${baseFileName}-(\\d+)${fileExtension.replace(/\./g, '\\.')}$`);

    let highestSuffix = 0;

    try {
      // Read the directory contents
      const files = fs.readdirSync(outputDir);

      // Find all files that match our pattern and get the highest suffix
      for (const file of files) {
        const match = file.match(fileRegex);

        if (match && match[1]) {
          const suffixNum = parseInt(match[1], 10);

          if (!isNaN(suffixNum) && suffixNum > highestSuffix) {
            highestSuffix = suffixNum;
          }
        }
      }

      // If there are no files with suffixes and the base file doesn't exist, return the base file path
      if (highestSuffix === 0 && !fs.existsSync(fullFilePath)) {
        return filePath;
      }

      // If there are files with suffixes or the base file exists, create a new file with the next suffix
      const nextSuffix = highestSuffix + 1;

      return path.resolve(outputDir, `${baseFileName}-${nextSuffix}`);
    } catch (error) {
      // If there's an error reading the directory, fall back to the original counter method
      this.ctx.outputService.log(
        `Error reading directory: ${error instanceof Error ? error.message : String(error)}`
      );

      return this.getFallbackUniqueFilePath(outputDir, baseFileName, fileExtension);
    }
  }

  /**
   * Fallback method to generate a unique file path if directory reading fails
   * @param outputDir The directory where the file will be saved
   * @param baseFileName The base file name without extension
   * @param fileExtension The file extension to check for (including the dot, e.g., '.xlsx')
   * @returns A unique file path that doesn't exist yet (without the extension)
   */
  private getFallbackUniqueFilePath(
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

  /**
   * Checks if package-lock.json exists in the project directory
   * @throws Error if package-lock.json doesn't exist
   */
  private checkPackageLockExists(): void {
    const packageLockPath = path.resolve(this.ctx.cwd, this.packageLockFileName);

    if (!fs.existsSync(packageLockPath)) {
      throw new Error(
        `${PACKAGE_LOCK_FILE_NAME} file not found. Please run "npm i --package-lock-only" to generate it first.`
      );
    }
  }
}

export default PackageFileService;
