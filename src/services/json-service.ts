import path from 'path';

import fs from 'fs-extra';

import ExportService from '@/services/export-service';
import type PackageInfoService from '@/services/package-info-service';
import type { ServiceType } from '@/services/service';
import type SummaryService from '@/services/summary-service';
import type { Summary } from '@/utils/types';

/**
 * The JsonService class is responsible for generating a JSON report from package data
 * It extends the ExportService class and provides functionality to export data to JSON format
 */
class JsonService extends ExportService {
  private summaryData: Summary;

  constructor(list: PackageInfoService[], summary: SummaryService, ctx: ServiceType) {
    super(list, summary, ctx);
    this.summaryData = summary.getSummary();
  }

  /**
   * Returns the file extension for JSON export
   * @returns The file extension string
   */
  public getFileExtension(): string {
    return '.json';
  }

  /**
   * Prepares the data for JSON export
   * @returns Object containing the dependencies list and summary
   */
  private prepareData() {
    // Convert the list of PackageInfoService instances to plain objects
    const dependencies = this.list.map((packageInfo) => packageInfo.getInfo());

    return {
      dependencies,
      summary: this.summaryData,
    };
  }

  /**
   * Saves the JSON data to a file
   * @param filePath The path where the file should be saved (without extension)
   */
  public async saveToFile(filePath: string): Promise<void> {
    const data = this.prepareData();
    const fullPath = `${filePath}${this.getFileExtension()}`;
    
    // Create directory if it doesn't exist
    const directory = path.dirname(fullPath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    // Write the JSON data to the file
    await fs.promises.writeFile(
      fullPath,
      JSON.stringify(data, null, 2),
      'utf8'
    );
    
    this.ctx.outputService.successMsg(`JSON file created at ${fullPath}`);
  }
}

export default JsonService;
