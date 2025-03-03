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
    upToDate: '00FF00', // Green color
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
      cell.value = 'up-to-date';
      
      cell.fill = this._getCellBgColorConfig(this.bgColors.upToDate);
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
    // const headerRow = worksheetSum.addRow([
    //   'Dependency Type',
    //   'Total',
    //   'Up-to-Date',
    //   'Major',
    //   'Minor',
    //   'Patch',
    // ]);

    worksheetSum.columns = [
      { header: 'Dependency Type', width: 20 },
      { header: 'Total', width: 10 },
      { header: 'Up-to-Date', width: 15 },
      { header: 'Outdated', width: 15 },
      {
        header: 'Major',
        width: 10,
        fill: this._getCellBgColorConfig(this.bgColors.major),
      },
      {
        header: 'Minor',
        width: 10,
        fill: this._getCellBgColorConfig(this.bgColors.minor),
      },
      {
        header: 'Patch',
        width: 10,
        fill: this._getCellBgColorConfig(this.bgColors.patch),
      },
    ];

    // Make the header row bold
    worksheetSum.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Set header row background color
    // headerRow.getCell(4).fill = this._getCellBgColorConfig(this.bgColors.major);

    // headerRow.getCell(5).fill = this._getCellBgColorConfig(this.bgColors.minor);

    // headerRow.getCell(6).fill = this._getCellBgColorConfig(this.bgColors.patch);

    // Track totals for all columns
    let totalPackages = 0;
    let totalUpToDate = 0;
    let totalOutdated = 0;
    let totalMajor = 0;
    let totalMinor = 0;
    let totalPatch = 0;

    // Add summary data
    for (const [depType, stats] of Object.entries(summary)) {
      const outdatedCount = stats.major + stats.minor + stats.patch;
      
      worksheetSum.addRow([
        depType,
        stats.total,
        stats.upToDate,
        outdatedCount,
        stats.major,
        stats.minor,
        stats.patch,
      ]);

      // Accumulate totals
      totalPackages += stats.total;
      totalUpToDate += stats.upToDate;
      totalOutdated += outdatedCount;
      totalMajor += stats.major;
      totalMinor += stats.minor;
      totalPatch += stats.patch;
    }

    // Add empty row
    worksheetSum.addRow([]);

    // Add total row with bold formatting
    const totalRow = worksheetSum.addRow([
      'Total',
      totalPackages,
      totalUpToDate,
      totalOutdated,
      totalMajor,
      totalMinor,
      totalPatch,
    ]);

    // Apply bold formatting to the total row
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
    });
  }

  private _handleDependenciesWorksheet() {
    const worksheetDeps = this.workbook.addWorksheet('Dependencies');

    worksheetDeps.columns = [
      { header: 'Package', key: 'packageName', width: 30 },
      { header: 'Status', key: 'packageStatus', width: 10 },
      { header: 'Current Version', key: 'curVersion', width: 10 },
      { header: 'Installed Version', key: 'installedVersion', width: 10 },
      {
        header: 'Installed Version Release Date',
        key: 'installedVersionReleaseDate',
        width: 10,
      },
      { header: 'Last Minor Version', key: 'lastMinorVersion', width: 10 },
      {
        header: 'Last Minor Version Release Date',
        key: 'lastMinorVersionReleaseDate',
        width: 10,
      },
      { header: 'Last Version', key: 'latestVersion', width: 10 },
      {
        header: 'Last Version Release Date',
        key: 'latestVersionReleaseDate',
        width: 10,
      },
      { header: 'Source', key: 'source', width: 20 },
      { header: 'Dependency Type', key: 'depType', width: 20 },
    ];

    // Make the header row bold
    worksheetDeps.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Freeze the first row and first column so they remain visible when scrolling
    worksheetDeps.views = [
      { state: 'frozen', xSplit: 1, ySplit: 1, topLeftCell: 'B2', activeCell: 'B2' }
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
        lastMinorVersionReleaseDate:
          row.lastMinorVersionReleaseDate && convertDate(row.lastMinorVersionReleaseDate),
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
