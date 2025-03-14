/**
 * @fileoverview Provides the ExcelService class for generating Excel reports of dependency information.
 *
 * This module implements a service for creating detailed Excel reports with features including:
 * - Creating multiple worksheets (summary and detailed dependencies)
 * - Formatting cells with colors based on update status (major, minor, patch)
 * - Adding hyperlinks to npm package URLs
 * - Highlighting deprecated packages
 * - Generating summary statistics by dependency type
 * - Including project metadata and report information
 *
 * The service extends the base ExportService and specializes in Excel-specific
 * formatting and presentation of dependency data for better readability and analysis.
 */

import ExcelJS from 'exceljs';

import ExportService from '@/services/export/export-service';
import type SummaryService from '@/services/export/summary-service';
import type PackageInfoService from '@/services/package-info-service';
import type { ServiceType } from '@/services/service';
import type { PackageStatus, Summary } from '@/utils/types';

class ExcelService extends ExportService {
  private workbook: ExcelJS.Workbook;

  private summaryData: Summary;

  private bgColors = {
    major: 'FF0000', // Red color
    minor: 'FFA500', // Orange color
    patch: 'ADD8E6', // Blue color
    upToDate: '00FF00', // Green color
  };

  constructor(list: PackageInfoService[], summary: SummaryService, ctx: ServiceType) {
    super(list, summary, ctx);

    this.workbook = new ExcelJS.Workbook();

    this.summaryData = summary.getSummary();

    this.handleSummaryWorksheet();

    this.handleDependenciesWorksheet();
  }

  /**
   * Returns the file extension for Excel files
   * @returns The file extension including the dot (e.g., '.xlsx')
   */
  public getFileExtension(): string {
    return '.xlsx';
  }

  public async saveToFile(filePath: string): Promise<void> {
    const fullFilePath = `${filePath}${this.getFileExtension()}`;

    await this.workbook.xlsx.writeFile(fullFilePath);

    this.ctx.outputService.successMsg(`Excel file created at ${fullFilePath}`);
  }

  private getCellBgColorConfig(color: string): ExcelJS.FillPattern {
    return {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color },
    };
  }

  private handleUpdateStatus(cell: ExcelJS.Cell, status?: PackageStatus) {
    if (!status) {
      return;
    }

    cell.value = status;

    if (status === 'upToDate') {
      cell.fill = this.getCellBgColorConfig(this.bgColors.upToDate);
    } else if (status === 'patch') {
      cell.fill = this.getCellBgColorConfig(this.bgColors.patch);
    } else if (status === 'minor') {
      cell.fill = this.getCellBgColorConfig(this.bgColors.minor);
    } else if (status === 'major') {
      cell.fill = this.getCellBgColorConfig(this.bgColors.major);
    }
  }

  /**
   * Formats a cell to display deprecated status with appropriate styling
   * @param cell The cell to format
   * @param isDeprecated Whether the package/version is deprecated
   * @param versionExists Whether the version exists
   */
  private handleDeprecatedStatus(
    cell: ExcelJS.Cell,
    isDeprecated?: boolean,
    versionExists: boolean = true
  ) {
    // Only set value if the version exists
    if (versionExists && isDeprecated !== undefined) {
      cell.value = isDeprecated ? 'yes' : 'no';

      if (isDeprecated) {
        cell.fill = this.getCellBgColorConfig('FF0000'); // Red color
        // No font styling applied to keep text as default black
      }
    } else {
      cell.value = ''; // Leave cell empty if no version exists
    }
  }

  /**
   * Creates a URL cell with a clickable hyperlink
   * @param cell The cell to format as a URL
   * @param text The text to display in the cell
   * @param url The URL to make clickable
   * @param tooltip Optional tooltip to display when hovering over the URL
   * @param italic Whether to make the text italic (default: false)
   */
  /**
   * Checks if a string is a valid URL
   * @param str The string to check
   * @returns True if the string is a valid URL, false otherwise
   */
  private isValidUrl(str: string): boolean {
    try {
      const url = new URL(str);

      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Creates a URL cell with a clickable hyperlink
   * @param cell The cell to format as a URL
   * @param text The text to display in the cell
   * @param url The URL to make clickable
   * @param tooltip Optional tooltip to display when hovering over the URL
   * @param italic Whether to make the text italic (default: false)
   */
  private createUrlCell(
    cell: ExcelJS.Cell,
    text: string,
    url: string,
    tooltip?: string,
    italic: boolean = false
  ): void {
    cell.value = {
      text,
      hyperlink: url,
      tooltip,
    };

    cell.font = {
      color: { argb: '0000FF' },
      underline: true,
      italic,
    };

    cell.alignment = { horizontal: 'left' };
  }

  /**
   * Adds a URL row to the worksheet with a label and clickable URL
   * @param worksheet The worksheet to add the row to
   * @param label The label for the URL (e.g., "Website", "NPM", "GitHub")
   * @param url The URL to make clickable
   * @param tooltip The tooltip to display when hovering over the URL
   * @returns The row that was added
   */
  private addUrlRow(
    worksheet: ExcelJS.Worksheet,
    label: string,
    url: string,
    tooltip?: string
  ): ExcelJS.Row {
    const row = worksheet.addRow([label, url]);

    // Style the label cell
    const labelCell = row.getCell(1);

    labelCell.font = { italic: true, color: { argb: '666666' } };

    labelCell.alignment = { horizontal: 'left' };

    // Style the URL cell and make it clickable
    const urlCell = row.getCell(2);

    this.createUrlCell(urlCell, url, url, tooltip, true);

    return row;
  }

  private handleSummaryWorksheet() {
    const worksheetSum = this.workbook.addWorksheet('Summary');

    // Set column widths
    worksheetSum.columns = [
      { width: 20 }, // A - Dependency Type / Report labels
      { width: 10 }, // B - Total / Report values
      { width: 15 }, // C - Up-to-Date
      { width: 15 }, // D - Outdated
      { width: 10 }, // E - Major
      { width: 10 }, // F - Minor
      { width: 10 }, // G - Patch
      { width: 10 }, // H - Deprecated
    ];

    // Get report info from summary service
    const reportInfo = this.summaryData.reportInfo;

    // Add report information at the top
    worksheetSum.addRow(['Report Date:', reportInfo.date]);

    worksheetSum.addRow(['Report Time:', reportInfo.time]);

    worksheetSum.addRow(['Project Name:', reportInfo.projectName]);

    worksheetSum.addRow(['Project Version:', reportInfo.projectVersion]);

    // Add empty row for spacing
    worksheetSum.addRow([]);

    // Add column headers for dependency table (row 6)
    worksheetSum.addRow([
      'Dependency Type',
      'Total',
      'Up-to-Date',
      'Outdated',
      'Major',
      'Minor',
      'Patch',
      'Deprecated',
    ]);

    // Make the header row bold
    worksheetSum.getRow(6).eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Add summary data for each dependency type
    for (const [depType, stats] of Object.entries(this.summaryData.byType)) {
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
    }

    // Add empty row
    worksheetSum.addRow([]);

    // Get totals from the summary object
    const { totals } = this.summaryData;

    // Add total row with bold formatting
    const totalRow = worksheetSum.addRow([
      'Total',
      totals.total,
      totals.upToDate,
      totals.outdated,
      totals.major,
      totals.minor,
      totals.patch,
      totals.deprecated,
    ]);

    // Apply bold formatting to the total row
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
    });

    // Add empty rows for spacing
    worksheetSum.addRow([]);

    worksheetSum.addRow([]);

    // Get package info rows data from summary service
    const sourceInfoRows = this.summaryData.sourceInfo;

    if (sourceInfoRows) {
      // Add information about the package
      const infoRow = worksheetSum.addRow([sourceInfoRows.info]);

      // Merge cells for the info text and apply styling
      worksheetSum.mergeCells(infoRow.number, 1, infoRow.number, 8);

      const infoCell = infoRow.getCell(1);

      infoCell.font = { italic: true, color: { argb: '666666' } };

      infoCell.alignment = { horizontal: 'left' };

      // Add source info rows
      for (const urlInfo of sourceInfoRows.urls) {
        this.addUrlRow(worksheetSum, urlInfo.label, urlInfo.url);
      }
    }
  }

  private handleDependenciesWorksheet() {
    const worksheetDeps = this.workbook.addWorksheet('Dependencies');

    worksheetDeps.columns = [
      { header: 'Package Name', key: 'packageName', width: 30 },
      { header: 'Update Status', key: 'updateStatus', width: 10 },
      { header: 'Required Version', key: 'versionRequired', width: 10 },
      { header: 'Installed Version', key: 'installedVersion', width: 10 },
      { header: 'Installed Version Deprecated', key: 'installedVersionDeprecated', width: 10 },
      {
        header: 'Installed Version Published Date',
        key: 'installDate',
        width: 15,
      },
      { header: 'Latest Patch Version', key: 'latestPatch', width: 10 },
      { header: 'Latest Patch Version Deprecated', key: 'latestPatchDeprecated', width: 10 },
      {
        header: 'Latest Patch Version Published Date',
        key: 'latestPatchDate',
        width: 15,
      },
      { header: 'Latest Minor Version', key: 'latestMinor', width: 10 },
      { header: 'Latest Minor Version Deprecated', key: 'latestMinorDeprecated', width: 10 },
      {
        header: 'Latest Minor Version Published Date',
        key: 'latestMinorDate',
        width: 15,
      },
      { header: 'Latest Available Version', key: 'latestVersion', width: 15 },
      { header: 'Latest Available Version Deprecated', key: 'latestVersionDeprecated', width: 10 },
      {
        header: 'Latest Version Published Date',
        key: 'latestVersionDate',
        width: 15,
      },
      { header: 'Registry Source', key: 'registrySource', width: 20 },
      { header: 'Dependency Type', key: 'dependencyType', width: 20 },
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
        dependencyType: row.dependencyType,
        versionRequired: row.versionRequired,
        installedVersion: row.versionInstalled?.version,
        installedVersionDeprecated: '', // Will be set by handleDeprecatedStatus
        installDate: row.versionInstalled?.releaseDate,
        latestPatch: row.versionLastPatch?.version,
        latestPatchDeprecated: '', // Will be set by handleDeprecatedStatus
        latestPatchDate: row.versionLastPatch?.releaseDate,
        latestMinor: row.versionLastMinor?.version,
        latestMinorDeprecated: '', // Will be set by handleDeprecatedStatus
        latestMinorDate: row.versionLastMinor?.releaseDate,
        latestVersion: row.versionLast?.version,
        latestVersionDeprecated: '', // Will be set by handleDeprecatedStatus
        latestVersionDate: row.versionLast?.releaseDate,
        updateStatus: row.updateStatus,
        registrySource: row.registrySource,
      });

      const packageStatusCell = newRow.getCell('updateStatus');

      this.handleUpdateStatus(packageStatusCell, row.updateStatus);

      // Handle deprecated status for each version
      const installedDeprecatedCell = newRow.getCell('installedVersionDeprecated');

      this.handleDeprecatedStatus(
        installedDeprecatedCell,
        row.versionInstalled?.deprecated,
        !!row.versionInstalled
      );

      const latestPatchDeprecatedCell = newRow.getCell('latestPatchDeprecated');

      this.handleDeprecatedStatus(
        latestPatchDeprecatedCell,
        row.versionLastPatch?.deprecated,
        !!row.versionLastPatch
      );

      const latestMinorDeprecatedCell = newRow.getCell('latestMinorDeprecated');

      this.handleDeprecatedStatus(
        latestMinorDeprecatedCell,
        row.versionLastMinor?.deprecated,
        !!row.versionLastMinor
      );

      const latestVersionDeprecatedCell = newRow.getCell('latestVersionDeprecated');

      this.handleDeprecatedStatus(
        latestVersionDeprecatedCell,
        row.versionLast?.deprecated,
        !!row.versionLast
      );

      // Convert installed version cell to a hyperlink if URL is available
      if (row.versionInstalled?.version && row.versionInstalled?.npmUrl) {
        const installedVersionCell = newRow.getCell('installedVersion');

        this.createUrlCell(
          installedVersionCell,
          row.versionInstalled.version,
          row.versionInstalled.npmUrl
        );
      }

      // Convert latest patch version cell to a hyperlink if URL is available
      if (row.versionLastPatch?.version && row.versionLastPatch?.npmUrl) {
        const latestPatchCell = newRow.getCell('latestPatch');

        this.createUrlCell(
          latestPatchCell,
          row.versionLastPatch.version,
          row.versionLastPatch.npmUrl
        );
      }

      // Convert latest minor version cell to a hyperlink if URL is available
      if (row.versionLastMinor?.version && row.versionLastMinor?.npmUrl) {
        const latestMinorCell = newRow.getCell('latestMinor');

        this.createUrlCell(
          latestMinorCell,
          row.versionLastMinor.version,
          row.versionLastMinor.npmUrl
        );
      }

      // Convert latest version cell to a hyperlink if URL is available
      if (row.versionLast?.version && row.versionLast?.npmUrl) {
        const latestVersionCell = newRow.getCell('latestVersion');

        this.createUrlCell(latestVersionCell, row.versionLast.version, row.versionLast.npmUrl);
      }

      // Handle registrySource - check if it's a valid URL and make it clickable if it is
      if (row.registrySource) {
        const registrySourceCell = newRow.getCell('registrySource');

        if (this.isValidUrl(row.registrySource)) {
          this.createUrlCell(registrySourceCell, row.registrySource, row.registrySource);
        } else {
          registrySourceCell.value = row.registrySource;

          registrySourceCell.alignment = { horizontal: 'left' };
        }
      }
    }
  }
}

export default ExcelService;
