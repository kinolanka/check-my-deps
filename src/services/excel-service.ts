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
      { header: 'Status', key: 'packageStatus', width: 20 },
      { header: 'Current Version', key: 'curVersion', width: 15 },
      { header: 'Installed Version', key: 'installedVersion', width: 15 },
      { header: 'Last Minor Version', key: 'lastMinorVersion', width: 20 },
      { header: 'Last Version', key: 'latestVersion', width: 20 },
      { header: 'Source', key: 'source', width: 30 },
      { header: 'Dependency Type', key: 'depType', width: 20 },
    ];

    this.list = list;
  }

  private handlePackageStatus(cell: ExcelJS.Cell, status?: string) {
    if (status === 'upToDate') {
      cell.value = '';
    } else {
      cell.value = status;
      if (status === 'minor') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFA500' }, // Orange color
        };
      } else if (status === 'major') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0000' }, // Red color
        };
      } else if (status === 'patch') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'ADD8E6' }, // Blue color
        };
      }
    }
  }

  public async saveToFile(filePath: string) {
    for (const packageInfo of this.list) {
      const row = packageInfo.getInfo();

      const newRow = this.worksheet.addRow({
        packageName: row.packageName,
        depType: row.depType,
        curVersion: row.curVersion,
        installedVersion: row.installedVersion,
        lastMinorVersion: row.lastMinorVersion,
        latestVersion: row.latestVersion,
        packageStatus: row.packageStatus,
        source: row.source,
      });

      const packageStatusCell = newRow.getCell('packageStatus');
      this.handlePackageStatus(packageStatusCell, row.packageStatus);
    }

    const fullFilePath = `${filePath}.xlsx`;

    await this.workbook.xlsx.writeFile(fullFilePath);

    this.ctx.outputService.successMsg(`Excel file created at ${fullFilePath}`);
  }
}

export default ExcelService;
