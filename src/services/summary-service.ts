import type PackageFileService from '@/services/package-file-service';
import type PackageInfoService from '@/services/package-info-service';
import Service from '@/services/service';
import type { ServiceType } from '@/services/service';
import { PACKAGE_NAME, WEBSITE_URL, NPM_URL, GITHUB_URL } from '@/utils/constants';
import formatDate from '@/utils/helpers/format-date';
import type { Summary, SummaryStats, SummaryTotals } from '@/utils/types';

/**
 * The SummaryService class is responsible for generating a summary of package statistics from a list of PackageInfoService instances.
 * It extends the Service class and provides the following functionality:
 */

class SummaryService extends Service {
  private list: PackageInfoService[];

  private packageFileService: PackageFileService;

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
    reportInfo: {
      date: '',
      time: '',
      projectName: '',
      projectVersion: '',
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

    this._init();
  }

  private _init() {
    this.calculateSummaryByType();

    this.calculateTotals();

    this.generateReportInfo();

    this.generateSourceInfo();
  }

  private calculateSummaryByType() {
    const summaryByType: Record<string, SummaryStats> = {};

    for (const packageInfo of this.list) {
      const row = packageInfo.getInfo();

      if (!summaryByType[row.dependencyType]) {
        summaryByType[row.dependencyType] = {
          total: 0,
          upToDate: 0,
          patch: 0,
          minor: 0,
          major: 0,
          deprecated: 0,
        };
      }

      // Increment the total count for this dependency type
      summaryByType[row.dependencyType].total += 1;

      if (row.updateStatus) {
        summaryByType[row.dependencyType][row.updateStatus] += 1;
      }

      // Count only packages where the installed version is deprecated
      if (row.versionInstalled?.deprecated) {
        summaryByType[row.dependencyType].deprecated += 1;
      }
    }

    this.summary.byType = summaryByType;
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
   * Generates report information including current date, time, project name and version
   * @returns ReportInfo object with date, time, project name and version
   */
  private generateReportInfo() {
    // Get current date and time
    const now = new Date();

    // Format date as MM/DD/YYYY with leading zeros for month and day when less than 10
    const date = formatDate(now);

    const time = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Get project name and version from package file service
    const projectName = this.packageFileService.getName();
    const projectVersion = this.packageFileService.getVersion();

    this.summary.reportInfo = {
      date,
      time,
      projectName,
      projectVersion,
    };
  }

  public generateSourceInfo(): void {
    this.summary.sourceInfo = {
      info: `This report was created using npm package ${PACKAGE_NAME}`,
      urls: [
        { label: 'Website', url: WEBSITE_URL },
        { label: 'NPM', url: NPM_URL },
        { label: 'GitHub', url: GITHUB_URL },
      ],
    };
  }

  /**
   * Returns the calculated summary statistics
   */
  public getSummary(): Summary {
    return this.summary;
  }
}

export default SummaryService;
