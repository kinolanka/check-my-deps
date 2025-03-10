import path from 'path';

import fs from 'fs-extra';
import { type PackageJson } from 'type-fest';

import { PACKAGE_FILE_NAME } from '@/utils/constants';

/**
 * Reads and parses the package.json file from the current directory.
 *
 * @returns {PackageJson} The parsed contents of package.json as a PackageJson object
 * @throws Will throw an error if package.json cannot be found or parsed
 * @example
 * // Returns the package.json contents as an object
 * const packageInfo = getPackageInfo();
 * console.log(packageInfo.name); // Outputs the package name
 */
const getPackageInfo = (): PackageJson => {
  const packageJsonPath = path.join(PACKAGE_FILE_NAME);

  return fs.readJSONSync(packageJsonPath) as PackageJson;
};

export default getPackageInfo;
