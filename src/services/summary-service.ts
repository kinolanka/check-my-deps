import Service, { ServiceType } from '@/services/service';
import PackageInfoService from '@/services/package-info-service';
import PackageFileService from '@/services/package-file-service';
import { Summary, SummaryStats, SummaryTotals, ReportInfo } from '@/utils/types';
import { PACKAGE_NAME, WEBSITE_URL, NPM_URL, GITHUB_URL } from '@/utils/constants';

/**
 * The SummaryService class is responsible for generating a summary of package statistics from a list of PackageInfoService instances.
 * It extends the Service class and provides the following functionality:
 *
 * - Constructor: Initializes the SummaryService with a list of PackageInfoService instances and a context. It also calls the _init method to initialize the summary.
 * - _init Method: Iterates over the list of PackageInfoService instances, retrieves package information, and calculates statistics such as the total number of packages, and the number of packages that are up-to-date, minor, major, or patch updates. These statistics are stored in the summary property.
 * - calculateTotals Method: Calculates the total statistics across all dependency types.
 * - getSummary Method: Returns the calculated summary statistics.
 * - getPackageInfoRows Method: Returns the package information rows data for summary display.
 * - getReportInfo Method: Returns information about the created report including date, time, project name and version.
 *
 * The summary statistics are stored in a Summary type object, which includes both dependency type specific stats and overall totals.
 */

class SummaryService extends Service {
  private list: PackageInfoService[];
  private packageFileService: PackageFileService;
  private reportInfo: ReportInfo;

  private summary: Summary = {
    byType: {},
    totals: {
      total: 0,
      upToDate: 0,
      major: 0,
      minor: 0,
      patch: 0,
      deprecated: 0,
      outdated: 0,
    },
  };

  constructor(
    list: PackageInfoService[],
    packageFileService: PackageFileService,
    ctx: ServiceType
  ) {
    super(ctx);
    this.list = list;
    this.packageFileService = packageFileService;
    this.reportInfo = this.generateReportInfo();

    this._init();
  }

  private _init() {
    this.calculateSummaryByType();

    this.calculateTotals();
  }

  private calculateSummaryByType() {
    const summaryByType: Record<string, SummaryStats> = {};

    for (const packageInfo of this.list) {
      const row = packageInfo.getInfo();

      if (!summaryByType[row.depType]) {
        summaryByType[row.depType] = {
          total: 0,
          upToDate: 0,
          patch: 0,
          minor: 0,
          major: 0,
          deprecated: 0,
        };
      }

      // Increment the total count for this dependency type
      summaryByType[row.depType].total += 1;

      if (row.updateStatus) {
        summaryByType[row.depType][row.updateStatus] += 1;
      }

      if (row.deprecated) {
        summaryByType[row.depType].deprecated += 1;
      }
    }

    this.summary.byType = summaryByType;
  }

  /**
   * Generates report information including current date, time, project name and version
   * @returns ReportInfo object with date, time, project name and version
   */
  private generateReportInfo(): ReportInfo {
    // Get current date and time
    const now = new Date();

    // Format date as M/D/YYYY to match package release dates format
    const month = now.getMonth() + 1; // months are zero-indexed
    const day = now.getDate();
    const year = now.getFullYear();
    const date = `${month}/${day}/${year}`;

    const time = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Get project name and version from package file service
    const projectName = this.packageFileService.getName();
    const projectVersion = this.packageFileService.getVersion();

    return {
      date,
      time,
      projectName,
      projectVersion,
    };
  }

  /**
   * Calculates the total statistics across all dependency types
   */
  private calculateTotals() {
    const totals: SummaryTotals = {
      total: 0,
      upToDate: 0,
      major: 0,
      minor: 0,
      patch: 0,
      deprecated: 0,
      outdated: 0,
    };

    for (const stats of Object.values(this.summary.byType)) {
      totals.total += stats.total;
      totals.upToDate += stats.upToDate;
      totals.major += stats.major;
      totals.minor += stats.minor;
      totals.patch += stats.patch;
      totals.deprecated += stats.deprecated;
    }

    // Calculate outdated as sum of major, minor, and patch
    totals.outdated = totals.major + totals.minor + totals.patch;

    this.summary.totals = totals;
  }

  /**
   * Returns the calculated summary statistics
   * @returns Summary object containing statistics by dependency type and totals
   */
  public getSummary(): Summary {
    return this.summary;
  }

  /**
   * Returns information about the created report
   * @returns ReportInfo object containing date, time, project name and version
   */
  public getReportInfo(): ReportInfo {
    return this.reportInfo;
  }

  /**
   * Returns the package information rows data for summary display
   * @returns Object containing package info text and URLs
   */
  public getPackageInfoRows(): {
    infoText: string;
    urls: Array<{ label: string; url: string; tooltip: string }>;
  } {
    return {
      infoText: `This report was created using npm package ${PACKAGE_NAME}`,
      urls: [
        { label: 'Website', url: WEBSITE_URL, tooltip: 'Visit website' },
        { label: 'NPM', url: NPM_URL, tooltip: 'Visit NPM package page' },
        { label: 'GitHub', url: GITHUB_URL, tooltip: 'Visit GitHub repository' },
      ],
    };
  }
}

export default SummaryService;
