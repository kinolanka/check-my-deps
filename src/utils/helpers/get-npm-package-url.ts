/**
 * Generates a URL for an npm package, optionally with a specific version.
 *
 * @param {string} packageName - The name of the npm package
 * @param {string} [packageVersion] - Optional version of the package
 * @returns {string} The URL to the npm package page, or an empty string if no package name is provided
 * @example
 * // Returns 'https://www.npmjs.com/package/lodash'
 * getNpmPackageUrl('lodash')
 *
 * // Returns 'https://www.npmjs.com/package/lodash/v/4.17.21'
 * getNpmPackageUrl('lodash', '4.17.21')
 */
const getNpmPackageUrl = (packageName: string, packageVersion?: string): string => {
  if (!packageName) {
    return '';
  }

  const baseUrl = `https://www.npmjs.com/package/${packageName}`;

  if (packageVersion) {
    return `${baseUrl}/v/${packageVersion}`;
  }

  return baseUrl;
};

export default getNpmPackageUrl;
