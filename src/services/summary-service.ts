import Service, { ServiceType } from '@/services/service';
import PackageInfoService from '@/services/package-info-service';
import { Summary, SummaryStats } from '@/utils/types';

/*
  The SummaryService class is responsible for generating a summary of package statistics from a list of PackageInfoService instances. It extends the Service class and provides the following functionality:

  - Constructor: Initializes the SummaryService with a list of PackageInfoService instances and a context. It also calls the _init method to initialize the summary.
  - _init Method: Iterates over the list of PackageInfoService instances, retrieves package information, and calculates statistics such as the total number of packages, and the number of packages that are up-to-date, minor, major, or patch updates. These statistics are stored in the summary property.
  - getSummary Method: Returns the calculated summary statistics.

  The summary statistics are stored in a Summary type object, which categorizes the packages based on their dependency type and status.
*/

class SummaryService extends Service {
  private list: PackageInfoService[];

  private summary: Summary = {};

  constructor(list: PackageInfoService[], ctx: ServiceType) {
    super(ctx);
    this.list = list;

    this._init();
  }

  private _init() {
    const summaryStats: SummaryStats = {
      total: 0,
      upToDate: 0,
      minor: 0,
      major: 0,
      patch: 0,
      deprecated: 0,
    };

    const summary: Summary = {};

    for (const packageInfo of this.list) {
      const row = packageInfo.getInfo();

      if (!summary[row.depType]) {
        summary[row.depType] = {
          ...summaryStats,
        };
      }

      summary[row.depType].total += 1;

      if (row.packageStatus) {
        summary[row.depType][row.packageStatus] += 1;
      }

      if (row.deprecated) {
        summary[row.depType].deprecated += 1;
      }
    }

    this.summary = summary;
  }

  public getSummary(): Summary {
    return this.summary;
  }
}

export default SummaryService;
