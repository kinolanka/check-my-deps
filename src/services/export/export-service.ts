/**
 * @fileoverview Provides the abstract ExportService class that serves as a base for all export format implementations.
 *
 * This module defines the abstract base class that all export services must extend.
 * It establishes a common interface for different export formats (Excel, JSON, etc.) with:
 * - A standardized constructor that accepts package information and summary data
 * - Abstract methods that concrete implementations must provide
 * - Common properties shared across all export formats
 *
 * The abstract class ensures that all export services follow a consistent pattern,
 * making it easy to add new export formats in the future while maintaining a unified API.
 */

import type SummaryService from '@/services/export/summary-service';
import type PackageInfoService from '@/services/package-info-service';
import type { ServiceType } from '@/services/service';
import Service from '@/services/service';

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
  abstract saveToFile(filePath: string): Promise<void>;
}

export default ExportService;
