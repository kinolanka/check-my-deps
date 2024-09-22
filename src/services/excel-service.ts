import ExcelJS from 'exceljs';
import NpmService from './npm-service';

export default class ExcelService {
  private workbook: ExcelJS.Workbook;
  private worksheet: ExcelJS.Worksheet;

  constructor() {
    this.workbook = new ExcelJS.Workbook();
    this.worksheet = this.workbook.addWorksheet('Dependencies');
    this.worksheet.columns = [
      { header: 'Package', key: 'packageName', width: 30 },
      { header: 'Current Version', key: 'curVersion', width: 15 },
      { header: 'Installed Version', key: 'installedVersion', width: 15 },
      { header: 'Last Minor Version', key: 'lastMinorVersion', width: 20 },
      { header: 'Last Version', key: 'latestVersion', width: 20 },
      { header: 'Source', key: 'source', width: 30 },
      { header: 'Type', key: 'type', width: 20 },
    ];
  }

  public addDependenciesToSheet(
    dependencies: Record<string, string>,
    type: string,
    installedVersionsAndSources: Record<string, { version: string; source: string }>,
    NpmService: NpmService
  ) {
    for (const [packageName, curVersion] of Object.entries(dependencies)) {
      const { version: installedVersion, source } = installedVersionsAndSources[packageName] || {
        version: 'N/A',
        source: 'N/A',
      };

      const rootDomain = source !== 'N/A' ? this.extractRootDomain(source) : 'N/A';
      const { lastMinorVersion, latestVersion } =
        installedVersion !== 'N/A'
          ? NpmService.getLastMinorAndLatestVersion(packageName, installedVersion)
          : { lastMinorVersion: null, latestVersion: null };

      const row = this.worksheet.addRow({
        packageName,
        curVersion,
        installedVersion,
        lastMinorVersion: lastMinorVersion || '',
        latestVersion: latestVersion || '',
        source: rootDomain,
        type,
      });

      if (installedVersion !== 'N/A' && source !== 'N/A') {
        let registryUrl: URL;

        if (source.includes('npmjs.com')) {
          registryUrl = new URL(
            `https://www.npmjs.com/package/${packageName}/v/${installedVersion}`
          );
        } else if (source.includes('github.com')) {
          registryUrl = new URL(
            `https://github.com/${packageName}/releases/tag/v${installedVersion}`
          );
        } else {
          registryUrl = new URL(source);
          registryUrl.pathname = `${packageName}/v/${installedVersion}`;
        }

        row.getCell('installedVersion').value = {
          text: installedVersion,
          hyperlink: registryUrl.toString(),
        };
      }
    }
  }

  public async saveToFile(filePath: string) {
    await this.workbook.xlsx.writeFile(filePath);
  }

  private extractRootDomain(url: string): string {
    try {
      const { hostname } = new URL(url);
      return hostname;
    } catch {
      return url;
    }
  }
}
