import path from 'path';

import fs from 'fs-extra';
import { type PackageJson } from 'type-fest';

const getPackageInfo = (): PackageJson => {
  const packageJsonPath = path.join('package.json');

  return fs.readJSONSync(packageJsonPath) as PackageJson;
};

export default getPackageInfo;
