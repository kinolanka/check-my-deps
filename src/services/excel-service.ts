import ExcelJS from 'exceljs';

import Service, { ServiceType } from '@/services/service';
import PackageInfoService from '@/services/package-info-service';

class ExcelService extends Service {
  private workbook: ExcelJS.Workbook;

  private worksheet: ExcelJS.Worksheet;

  private list: PackageInfoService[];

  constructor(list: PackageInfoService[], ctx: ServiceType) {
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
      { header: 'Type', key: 'depType', width: 20 },
    ];

    this.list = list;
  }

  public async saveToFile(filePath: string) {
    for (const packageInfo of this.list) {
      const row = packageInfo.getInfo();

      this.worksheet.addRow({
        packageName: row.packageName,
        depType: row.depType,
        curVersion: row.curVersion,
        installedVersion: row.installedVersion,
        lastMinorVersion: row.lastMinorVersion,
        latestVersion: row.latestVersion,
        source: row.source,
      });
    }

    const fullFilePath = `${filePath}.xlsx`;

    await this.workbook.xlsx.writeFile(fullFilePath);

    this.ctx.outputService.successMsg(`Excel file created at ${fullFilePath}`);
  }
}

export default ExcelService;
