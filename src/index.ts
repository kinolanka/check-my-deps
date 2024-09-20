#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { Command } from 'commander';
import ExcelJS from 'exceljs';
import { execSync } from 'child_process';

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

async function main() {
  const program = new Command();

  program
    .description(
      'Get the content of the package.json file and export dependencies to an Excel file'
    )
    .option(
      '-c, --cwd <cwd>',
      'the working directory. defaults to the current directory.',
      process.cwd()
    )
    .action(async (options) => {
      const packageJsonPath = path.resolve(options.cwd, 'package.json');
      try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);

        const dependencies = packageJson.dependencies || {};
        const devDependencies = packageJson.devDependencies || {};
        const peerDependencies = packageJson.peerDependencies || {};

        const getInstalledVersionsAndSources = (): Record<
          string,
          { version: string; source: string }
        > => {
          try {
            let result;
            if (fs.existsSync(path.resolve(options.cwd, 'package-lock.json'))) {
              result = execSync(`npm list --json`, { cwd: options.cwd });
            } else if (fs.existsSync(path.resolve(options.cwd, 'yarn.lock'))) {
              result = execSync(`yarn list --json`, { cwd: options.cwd });
            } else if (fs.existsSync(path.resolve(options.cwd, 'pnpm-lock.yaml'))) {
              result = execSync(`pnpm list --json`, { cwd: options.cwd });
            } else {
              throw new Error('No lock file found. Please use npm, yarn, or pnpm.');
            }

            const jsonResult = JSON.parse(result.toString());
            const installedVersionsAndSources: Record<string, { version: string; source: string }> =
              {};

            const extractVersionsAndSources = (deps: Record<string, any>) => {
              for (const [name, info] of Object.entries(deps)) {
                const source = info.resolved || 'N/A';
                installedVersionsAndSources[name] = { version: info.version, source };
                if (info.dependencies) {
                  extractVersionsAndSources(info.dependencies);
                }
              }
            };

            extractVersionsAndSources(jsonResult.dependencies);
            return installedVersionsAndSources;
          } catch {
            return {};
          }
        };

        const getLastMinorAndLatestVersion = (
          packageName: string,
          installedVersion: string
        ): { lastMinorVersion: string | null; latestVersion: string | null } => {
          try {
            const result = execSync(`npm view ${packageName} versions --json`, {
              cwd: options.cwd,
            });
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
        };

        const installedVersionsAndSources = getInstalledVersionsAndSources();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Dependencies');

        worksheet.columns = [
          { header: 'Package', key: 'packageName', width: 30 },
          { header: 'Current Version', key: 'curVersion', width: 15 },
          { header: 'Installed Version', key: 'installedVersion', width: 15 },
          { header: 'Last Minor Version', key: 'lastMinorVersion', width: 20 },
          { header: 'Last Version', key: 'latestVersion', width: 20 },
          { header: 'Source', key: 'source', width: 30 },
          { header: 'Type', key: 'type', width: 20 },
        ];

        const extractRootDomain = (url: string): string => {
          try {
            const { hostname } = new URL(url);
            return hostname;
          } catch {
            return url;
          }
        };

        const addDependenciesToSheet = (deps: Record<string, string>, type: string) => {
          for (const [packageName, curVersion] of Object.entries(deps)) {
            const { version: installedVersion, source } = installedVersionsAndSources[
              packageName
            ] || { version: 'N/A', source: 'N/A' };

            const rootDomain = source !== 'N/A' ? extractRootDomain(source) : 'N/A';
            const { lastMinorVersion, latestVersion } =
              installedVersion !== 'N/A'
                ? getLastMinorAndLatestVersion(packageName, installedVersion)
                : { lastMinorVersion: null, latestVersion: null };
            worksheet.addRow({
              packageName,
              curVersion,
              installedVersion,
              lastMinorVersion: lastMinorVersion || '',
              latestVersion: latestVersion || '',
              source: rootDomain,
              type,
            });
          }
        };

        addDependenciesToSheet(dependencies, 'dependencies');
        addDependenciesToSheet(devDependencies, 'devdependencies');
        addDependenciesToSheet(peerDependencies, 'peerdependencies');

        const sanitizeFileName = (name: string): string => {
          return name
            .toLowerCase()
            .replace(/@/g, '')
            .replace(/[^a-z0-9]/g, '-');
        };

        const packageName = sanitizeFileName(packageJson.name || 'package');
        const filePath = path.resolve(options.cwd, `${packageName}-deps-check.xlsx`);
        await workbook.xlsx.writeFile(filePath);

        console.log(chalk.green(`Excel file created at ${filePath}`));
      } catch (error) {
        console.error(chalk.red((error as Error).message));
      }
    });

  program.parse(process.argv);
}

main();
