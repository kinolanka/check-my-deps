/**
 * @fileoverview Provides the SummaryService class for generating comprehensive package dependency summaries.
 *
 * This module implements a service for aggregating and analyzing package information with features including:
 * - Calculating statistics by dependency type (dependencies, devDependencies, etc.)
 * - Generating totals across all dependency types
 * - Tracking update status counts (up-to-date, patch, minor, major)
 * - Counting deprecated packages
 * - Creating report metadata (date, time, project name, version)
 * - Providing source information and relevant URLs
 *
 * The service transforms individual package data into aggregated statistics
 * and metadata that can be used by export services to generate reports.
 */

import type PackageFileService from '@/services/package-file-service';
import type PackageInfoService from '@/services/package-info-service';
import Service from '@/services/service';
import type { ServiceType } from '@/services/service';
import {
  THIS_PACKAGE_NAME,
  THIS_PACKAGE_WEBSITE_URL,
  THIS_PACKAGE_NPM_URL,
  THIS_PACKAGE_GITHUB_URL,
} from '@/utils/constants';
import formatDate from '@/utils/helpers/format-date';
import isNpmRegistryUrl from '@/utils/helpers/is-npm-registry-url';
import type { Summary, SummaryStats, SummaryTotals } from '@/utils/types';

class SummaryService extends Service {
  private list: PackageInfoService[];

  private packageFileService: PackageFileService;

  private summary: Summary = {
    byType: {},
    totals: {
      total: 0,
      fromNpmRegistry: 0,
      notFromNpmRegistry: 0,
      upToDate: 0,
      outdated: 0,
      major: 0,
      minor: 0,
      patch: 0,
      deprecated: 0,
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

    this.calculateSummaryByType();

    this.calculateTotals();

    this.generateReportInfo();

    this.generateSourceInfo();
  }

  /**
   * Generates information about the source package that created this report
   */
  public generateSourceInfo(): void {
    this.summary.sourceInfo = {
      info: `This report was created using npm package ${THIS_PACKAGE_NAME}`,
      urls: [
        { label: 'Website', url: THIS_PACKAGE_WEBSITE_URL },
        { label: 'NPM', url: THIS_PACKAGE_NPM_URL },
        { label: 'GitHub', url: THIS_PACKAGE_GITHUB_URL },
      ],
    };
  }

  /**
   * Returns the calculated summary statistics
   */
  public getSummary(): Summary {
    return this.summary;
  }

  private calculateSummaryByType() {
    const summaryByType: Record<string, SummaryStats> = {};

    for (const packageInfo of this.list) {
      const row = packageInfo.getInfo();

      if (!summaryByType[row.dependencyType]) {
        summaryByType[row.dependencyType] = {
          total: 0,
          fromNpmRegistry: 0,
          notFromNpmRegistry: 0,
          upToDate: 0,
          outdated: 0,
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

      // Count packages from npm registry and not from npm registry
      const registrySource = row.registrySource || '';

      if (isNpmRegistryUrl(registrySource)) {
        summaryByType[row.dependencyType].fromNpmRegistry += 1;
      } else if (registrySource) {
        summaryByType[row.dependencyType].notFromNpmRegistry += 1;
      }
    }

    // Calculate outdated count for each dependency type
    for (const stats of Object.values(summaryByType)) {
      stats.outdated = stats.major + stats.minor + stats.patch;
    }

    this.summary.byType = summaryByType;
  }

  /**
   * Calculates the total statistics across all dependency types
   */
  private calculateTotals() {
    const totals: SummaryTotals = {
      total: 0,
      fromNpmRegistry: 0,
      notFromNpmRegistry: 0,
      upToDate: 0,
      outdated: 0,
      major: 0,
      minor: 0,
      patch: 0,
      deprecated: 0,
    };

    for (const stats of Object.values(this.summary.byType)) {
      totals.total += stats.total;

      totals.upToDate += stats.upToDate;

      totals.major += stats.major;

      totals.minor += stats.minor;

      totals.patch += stats.patch;

      totals.deprecated += stats.deprecated;

      totals.fromNpmRegistry += stats.fromNpmRegistry;

      totals.notFromNpmRegistry += stats.notFromNpmRegistry;

      totals.outdated += stats.outdated;
    }

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
}

export default SummaryService;
