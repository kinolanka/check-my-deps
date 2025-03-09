import type PackageInfoService from '@/services/package-info-service';
import type { ServiceType } from '@/services/service';
import Service from '@/services/service';
import type SummaryService from '@/services/summary-service';

/**
 * Base interface for export services
 * Defines the common methods that all export services must implement
 */
abstract class ExportService extends Service {
  protected list: PackageInfoService[];
  protected summary: SummaryService;

  constructor(list: PackageInfoService[], summary: SummaryService, ctx: ServiceType) {
    super(ctx);
    this.list = list;
    this.summary = summary;
  }

  /**
   * Returns the file extension for the export format
   * @returns The file extension string
   */
  abstract getFileExtension(): string;

  /**
   * Saves the data to a file
   * @param {string} filePath - The path where the file should be saved (without extension)
   */
  // eslint-disable-next-line no-unused-vars
  abstract saveToFile(filePath: string): Promise<void>;
}

export default ExportService;
