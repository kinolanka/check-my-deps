import getNpmPackageUrl from './get-npm-package-url';

describe('getNpmPackageUrl', () => {
  describe('normal cases', () => {
    it('should return the correct URL for a regular package without version', () => {
      const packageName = 'lodash';

      const result = getNpmPackageUrl(packageName);

      expect(result).toBe('https://www.npmjs.com/package/lodash');
    });

    it('should return the correct URL for a regular package with version', () => {
      const packageName = 'lodash';

      const packageVersion = '4.17.21';

      const result = getNpmPackageUrl(packageName, packageVersion);

      expect(result).toBe('https://www.npmjs.com/package/lodash/v/4.17.21');
    });
  });

  describe('scoped packages', () => {
    it('should return the correct URL for a scoped package without version', () => {
      const packageName = '@types/react';

      const result = getNpmPackageUrl(packageName);

      expect(result).toBe('https://www.npmjs.com/package/@types/react');
    });

    it('should return the correct URL for a scoped package with version', () => {
      const packageName = '@types/react';

      const packageVersion = '18.0.0';

      const result = getNpmPackageUrl(packageName, packageVersion);

      expect(result).toBe('https://www.npmjs.com/package/@types/react/v/18.0.0');
    });
  });

  describe('edge cases', () => {
    it('should handle package names with special characters without encoding them', () => {
      const packageName = 'package-with-dash';

      const result = getNpmPackageUrl(packageName);

      expect(result).toBe('https://www.npmjs.com/package/package-with-dash');
    });

    it('should handle package versions with special characters without encoding them', () => {
      const packageName = 'some-package';

      const packageVersion = '1.0.0-beta.1+build.2';

      const result = getNpmPackageUrl(packageName, packageVersion);

      expect(result).toBe('https://www.npmjs.com/package/some-package/v/1.0.0-beta.1+build.2');
    });

    it('should handle empty package name', () => {
      const packageName = '';

      const result = getNpmPackageUrl(packageName);

      expect(result).toBe('');
    });

    it('should handle undefined version by not appending version path', () => {
      const packageName = 'react';

      const result = getNpmPackageUrl(packageName, undefined);

      expect(result).toBe('https://www.npmjs.com/package/react');
    });
  });

  describe('complex scoped packages', () => {
    it('should handle complex scoped package names correctly', () => {
      const packageName = '@angular/core';

      const result = getNpmPackageUrl(packageName);

      expect(result).toBe('https://www.npmjs.com/package/@angular/core');
    });

    it('should handle scoped packages with dashes', () => {
      const packageName = '@user/package-with-dash';

      const packageVersion = '1.0.0-alpha';

      const result = getNpmPackageUrl(packageName, packageVersion);

      expect(result).toBe('https://www.npmjs.com/package/@user/package-with-dash/v/1.0.0-alpha');
    });

    it('should handle the package name from the project itself', () => {
      const packageName = '@kinolanka/check-my-deps';

      const result = getNpmPackageUrl(packageName);

      expect(result).toBe('https://www.npmjs.com/package/@kinolanka/check-my-deps');
    });
  });
});
