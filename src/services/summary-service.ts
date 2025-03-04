import Service, { ServiceType } from '@/services/service';
import PackageInfoService from '@/services/package-info-service';
import { Summary, SummaryStats, SummaryTotals } from '@/utils/types';
import { PACKAGE_NAME, WEBSITE_URL, NPM_URL, GITHUB_URL } from '@/utils/constants';

/**
 * The SummaryService class is responsible for generating a summary of package statistics from a list of PackageInfoService instances.
 * It extends the Service class and provides the following functionality:
 * 
 * - Constructor: Initializes the SummaryService with a list of PackageInfoService instances and a context. It also calls the _init method to initialize the summary.
 * - _init Method: Iterates over the list of PackageInfoService instances, retrieves package information, and calculates statistics such as the total number of packages, and the number of packages that are up-to-date, minor, major, or patch updates. These statistics are stored in the summary property.
 * - _calculateTotals Method: Calculates the total statistics across all dependency types.
 * - getSummary Method: Returns the calculated summary statistics.
 * - getPackageInfoRows Method: Returns the package information rows data for summary display.
 * 
 * The summary statistics are stored in a Summary type object, which includes both dependency type specific stats and overall totals.
 */

class SummaryService extends Service {
  private list: PackageInfoService[];

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

  constructor(list: PackageInfoService[], ctx: ServiceType) {
    super(ctx);
    this.list = list;

    this._init();
  }

  private _init() {
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
    this._calculateTotals();
  }

  /**
   * Calculates the total statistics across all dependency types
   */
  private _calculateTotals() {
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
   * Returns the package information rows data for summary display
   * @returns Object containing package info text and URLs
   */
  public getPackageInfoRows(): { infoText: string; urls: Array<{ label: string; url: string; tooltip: string }> } {
    return {
      infoText: `This report was created using npm package ${PACKAGE_NAME}`,
      urls: [
        { label: 'Website', url: WEBSITE_URL, tooltip: 'Visit website' },
        { label: 'NPM', url: NPM_URL, tooltip: 'Visit NPM package page' },
        { label: 'GitHub', url: GITHUB_URL, tooltip: 'Visit GitHub repository' }
      ]
    };
  }
}

export default SummaryService;
