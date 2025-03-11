import https from 'https';

import { NPM_REGISTRY_HOST } from '@/utils/constants';
import type { NpmRegistryPackageData } from '@/utils/types';

/**
 * A client for interacting with the npm Registry API
 * This provides more efficient access to package data than using the npm CLI
 */
class NpmRegistryClient {
  /**
   * Fetches package data from the npm registry
   * @param packageName The name of the package to fetch
   * @returns A promise that resolves to the package data
   */
  public async getPackageData(packageName: string): Promise<NpmRegistryPackageData> {
    // Fetch from registry if not in cache
    return await this.fetchFromRegistry(packageName);
  }

  /**
   * Fetches package data from the npm registry
   * @param packageName The name of the package to fetch
   * @returns A promise that resolves to the package data
   */
  private fetchFromRegistry(packageName: string): Promise<NpmRegistryPackageData> {
    return new Promise((resolve, reject) => {
      const encodedPackageName = encodeURIComponent(packageName).replace('%40', '@');

      const url = `https://${NPM_REGISTRY_HOST}/${encodedPackageName}`;

      https
        .get(url, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const packageData = JSON.parse(data) as NpmRegistryPackageData;

                resolve(packageData);
              } catch (error) {
                reject(
                  new Error(
                    `Failed to parse response for ${packageName}: ${error instanceof Error ? error.message : String(error)}`
                  )
                );
              }
            } else if (res.statusCode === 404) {
              reject(new Error(`Package ${packageName} not found in npm registry`));
            } else {
              reject(new Error(`Failed to fetch package ${packageName}: ${res.statusCode}`));
            }
          });
        })
        .on('error', (error) => {
          reject(new Error(`Request error for ${packageName}: ${error.message}`));
        });
    });
  }
}

// Export a singleton instance
export default new NpmRegistryClient();
