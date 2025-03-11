import path from 'path';

import fs from 'fs-extra';

import { PACKAGE_FILE_NAME } from '@/utils/constants';
import getPackageInfo from '@/utils/helpers/get-package-info';

jest.mock('fs-extra');

jest.mock('path');

describe('getPackageInfo', () => {
  const mockPackageJson = {
    name: 'test-package',
    version: '1.0.0',
  };

  beforeEach(() => {
    (path.join as jest.Mock).mockReturnValue(PACKAGE_FILE_NAME);

    (fs.readJSONSync as jest.Mock).mockReturnValue(mockPackageJson);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the package.json content', () => {
    const result = getPackageInfo();

    expect(result).toEqual(mockPackageJson);
  });

  it('should call path.join with correct arguments', () => {
    getPackageInfo();

    expect(path.join).toHaveBeenCalledWith(PACKAGE_FILE_NAME);
  });

  it('should call fs.readJSONSync with correct path', () => {
    getPackageInfo();

    expect(fs.readJSONSync).toHaveBeenCalledWith(PACKAGE_FILE_NAME);
  });
});
