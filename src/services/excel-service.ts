import ExcelJS from 'exceljs';

import Service, { ServiceType } from '@/services/service';
import PackageInfoService from '@/services/package-info-service';
import SummaryService from '@/services/summary-service';
import { PackageStatus } from '@/utils/types';
import convertDate from '@/utils/helpers/convert-date';

class ExcelService extends Service {
  private workbook: ExcelJS.Workbook;

  private list: PackageInfoService[];

  private summary: SummaryService;

  private bgColors = {
    major: 'FF0000', // Red color
    minor: 'FFA500', // Orange color
    patch: 'ADD8E6', // Blue color
  };

  constructor(list: PackageInfoService[], summary: SummaryService, ctx: ServiceType) {
    super(ctx);

    this.workbook = new ExcelJS.Workbook();

    this.list = list;

    this.summary = summary;

    this._init();
  }

  private _init() {
    this._handleSummaryWorksheet();

    this._handleDependenciesWorksheet();
  }

  private _getCellBgColorConfig(color: string): ExcelJS.FillPattern {
    return {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
  }

  private _handlePackageStatus(cell: ExcelJS.Cell, status?: PackageStatus) {
    if (status === 'upToDate') {
      cell.value = '';
    } else {
      cell.value = status;

      if (status && status in this.bgColors) {
        cell.fill = this._getCellBgColorConfig(this.bgColors[status]);
      }
    }
  }

  private _handleSummaryWorksheet() {
    const worksheetSum = this.workbook.addWorksheet('Summary');

    const summary = this.summary.getSummary();

    // Add header row
    const headerRow = worksheetSum.addRow([
      'Dependency Type',
      'Total',
      'Up-to-Date',
      'Major',
      'Minor',
      'Patch',
    ]);

    // Set header row background color
    headerRow.getCell(4).fill = this._getCellBgColorConfig(this.bgColors.major);

    headerRow.getCell(5).fill = this._getCellBgColorConfig(this.bgColors.minor);

    headerRow.getCell(6).fill = this._getCellBgColorConfig(this.bgColors.patch);

    // Add summary data
    for (const [depType, stats] of Object.entries(summary)) {
      worksheetSum.addRow([
        depType,
        stats.total,
        stats.upToDate,
        stats.major,
        stats.minor,
        stats.patch,
      ]);
    }
  }

  private _handleDependenciesWorksheet() {
    const worksheetDeps = this.workbook.addWorksheet('Dependencies');

    worksheetDeps.columns = [
      { header: 'Package', key: 'packageName', width: 30 },
      { header: 'Status', key: 'packageStatus', width: 20 },
      { header: 'Current Version', key: 'curVersion', width: 15 },
      { header: 'Installed Version', key: 'installedVersion', width: 15 },
      { header: 'Installed Version Release Date', key: 'installedVersionReleaseDate', width: 15 },
      { header: 'Last Minor Version', key: 'lastMinorVersion', width: 20 },
      { header: 'Last Version', key: 'latestVersion', width: 20 },
      { header: 'Last Version Release Date', key: 'latestVersionReleaseDate', width: 20 },
      { header: 'Source', key: 'source', width: 30 },
      { header: 'Dependency Type', key: 'depType', width: 20 },
    ];

    for (const packageInfo of this.list) {
      const row = packageInfo.getInfo();

      const newRow = worksheetDeps.addRow({
        packageName: row.packageName,
        depType: row.depType,
        curVersion: row.curVersion,
        installedVersion: row.installedVersion,
        installedVersionReleaseDate:
          row.installedVersionReleaseDate && convertDate(row.installedVersionReleaseDate),
        lastMinorVersion: row.lastMinorVersion,
        latestVersion: row.latestVersion,
        latestVersionReleaseDate:
          row.latestVersionReleaseDate && convertDate(row.latestVersionReleaseDate),
        packageStatus: row.packageStatus,
        source: row.source,
      });

      const packageStatusCell = newRow.getCell('packageStatus');
      this._handlePackageStatus(packageStatusCell, row.packageStatus);
    }
  }

  public async saveToFile(filePath: string) {
    const fullFilePath = `${filePath}.xlsx`;

    await this.workbook.xlsx.writeFile(fullFilePath);

    this.ctx.outputService.successMsg(`Excel file created at ${fullFilePath}`);
  }
}

export default ExcelService;
