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

  private _handleUpdateStatus(cell: ExcelJS.Cell, status?: PackageStatus) {
    if (!status) {
      return;
    }

    cell.value = status;

    if (status === 'upToDate') {
      cell.fill = this._getCellBgColorConfig(this.bgColors.upToDate);
    } else if (status === 'patch') {
      cell.fill = this._getCellBgColorConfig(this.bgColors.patch);
    } else if (status === 'minor') {
      cell.fill = this._getCellBgColorConfig(this.bgColors.minor);
    } else if (status === 'major') {
      cell.fill = this._getCellBgColorConfig(this.bgColors.major);
    }
  }

  private _handleSummaryWorksheet() {
    const worksheetSum = this.workbook.addWorksheet('Summary');

    const summary = this.summary.getSummary();

    worksheetSum.columns = [
      { header: 'Dependency Type', width: 20 },
      { header: 'Total', width: 10 },
      { header: 'Up-to-Date', width: 15 },
      { header: 'Outdated', width: 15 },
      {
        header: 'Major',
        width: 10,
      },
      {
        header: 'Minor',
        width: 10,
      },
      {
        header: 'Patch',
        width: 10,
      },
      {
        header: 'Deprecated',
        width: 10,
      },
    ];

    // Make the header row bold
    worksheetSum.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Track totals for all columns
    let totalPackages = 0;
    let totalUpToDate = 0;
    let totalOutdated = 0;
    let totalMajor = 0;
    let totalMinor = 0;
    let totalPatch = 0;
    let totalDeprecated = 0;

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
        stats.deprecated,
      ]);

      // Accumulate totals
      totalPackages += stats.total;
      totalUpToDate += stats.upToDate;
      totalOutdated += outdatedCount;
      totalMajor += stats.major;
      totalMinor += stats.minor;
      totalPatch += stats.patch;
      totalDeprecated += stats.deprecated;
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
      totalDeprecated,
    ]);

    // Apply bold formatting to the total row
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
    });
  }

  private _handleDependenciesWorksheet() {
    const worksheetDeps = this.workbook.addWorksheet('Dependencies');

    worksheetDeps.columns = [
      { header: 'Package Name', key: 'packageName', width: 30 },
      { header: 'Update Status', key: 'updateStatus', width: 10 },
      { header: 'Is Deprecated', key: 'deprecated', width: 10 },
      { header: 'Required Version', key: 'reqVersion', width: 10 },
      { header: 'Installed Version', key: 'installedVersion', width: 10 },
      {
        header: 'Installed Version Published Date',
        key: 'installDate',
        width: 15,
      },
      { header: 'Latest Minor Version', key: 'latestMinor', width: 10 },
      {
        header: 'Latest Minor Version Published Date',
        key: 'latestMinorDate',
        width: 15,
      },
      { header: 'Latest Available Version', key: 'latestVersion', width: 15 },
      {
        header: 'Latest Version Published Date',
        key: 'latestVersionDate',
        width: 15,
      },
      { header: 'Registry Source', key: 'regSource', width: 20 },
      { header: 'Dependency Type', key: 'depType', width: 20 },
    ];

    // Make the header row bold
    worksheetDeps.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Freeze the first row and first column so they remain visible when scrolling
    worksheetDeps.views = [
      { state: 'frozen', xSplit: 1, ySplit: 1, topLeftCell: 'B2', activeCell: 'B2' },
    ];

    for (const packageInfo of this.list) {
      const row = packageInfo.getInfo();

      const newRow = worksheetDeps.addRow({
        packageName: row.packageName,
        depType: row.depType,
        reqVersion: row.reqVersion,
        installedVersion: row.installedVersion,
        installDate: row.installDate && convertDate(row.installDate),
        latestMinor: row.latestMinor,
        latestMinorDate: row.latestMinorDate && convertDate(row.latestMinorDate),
        latestVersion: row.latestVersion,
        latestVersionDate: row.latestVersionDate && convertDate(row.latestVersionDate),
        updateStatus: row.updateStatus,
        regSource: row.regSource,
        deprecated: row.deprecated ? 'yes' : 'no',
      });

      const packageStatusCell = newRow.getCell('updateStatus');
      this._handleUpdateStatus(packageStatusCell, row.updateStatus);

      // Highlight deprecated packages with a red background
      if (row.deprecated) {
        const deprecatedCell = newRow.getCell('deprecated');
        deprecatedCell.fill = this._getCellBgColorConfig('FF0000'); // Red color
      }
    }
  }

  public async saveToFile(filePath: string) {
    const fullFilePath = `${filePath}.xlsx`;

    await this.workbook.xlsx.writeFile(fullFilePath);

    this.ctx.outputService.successMsg(`Excel file created at ${fullFilePath}`);
  }
}

export default ExcelService;
