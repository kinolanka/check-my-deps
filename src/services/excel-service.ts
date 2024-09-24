import ExcelJS from 'exceljs';

import Service, { ServiceType } from '@/services/service';
import NpmService from '@/services/npm-service';
import { Dependencies, InstalledVersionsAndSources } from '@/utils/types';
import extractRootDomain from '@/utils/helpers/extract-root-domain';

class ExcelService extends Service {
  private workbook: ExcelJS.Workbook;
  private worksheet: ExcelJS.Worksheet;

  constructor(ctx: ServiceType) {
    super(ctx);

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
    dependencies: Dependencies,
    type: string,
    installedVersionsAndSources: InstalledVersionsAndSources,
    NpmService: NpmService
  ) {
    for (const [packageName, curVersion] of Object.entries(dependencies)) {
      const { version: installedVersion, source } = installedVersionsAndSources[packageName] || {
        version: 'N/A',
        source: 'N/A',
      };

      const rootDomain = source !== 'N/A' ? extractRootDomain(source) : 'N/A';
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
}

export default ExcelService;
