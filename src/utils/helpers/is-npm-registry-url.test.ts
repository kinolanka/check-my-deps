import { NPM_REGISTRY_HOST } from '@/utils/constants';
import isNpmRegistryUrl from '@/utils/helpers/is-npm-registry-url';

describe('isNpmRegistryUrl', () => {
  describe('normal cases', () => {
    it('should return true for a valid npm registry URL', () => {
      const url = `https://${NPM_REGISTRY_HOST}/lodash`;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(true);
    });

    it('should return true for a valid npm registry URL with package version', () => {
      const url = `https://${NPM_REGISTRY_HOST}/lodash/4.17.21`;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(true);
    });

    it('should return false for a non-npm registry URL', () => {
      const url = 'https://www.npmjs.com/package/lodash';

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(false);
    });
  });

  describe('scoped packages', () => {
    it('should return true for a valid npm registry URL with scoped package', () => {
      const url = `https://${NPM_REGISTRY_HOST}/@types/react`;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(true);
    });

    it('should return true for a valid npm registry URL with scoped package and version', () => {
      const url = `https://${NPM_REGISTRY_HOST}/@types/react/18.0.0`;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should return false for an empty string', () => {
      const url = '';

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(false);
    });

    it('should return false for null', () => {
      const url = null as unknown as string;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(false);
    });

    it('should return false for undefined', () => {
      const url = undefined as unknown as string;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(false);
    });

    it('should return false for a non-URL string', () => {
      const url = 'not-a-url';

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(false);
    });

    it('should return false for a URL with wrong protocol', () => {
      const url = `http://${NPM_REGISTRY_HOST}/lodash`;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(true); // Protocol doesn't matter, only the host
    });

    it('should return false for a URL with similar but incorrect host', () => {
      const url = 'https://registry.npmjs.com/lodash';

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(false);
    });
  });

  describe('complex URLs', () => {
    it('should return true for a URL with query parameters', () => {
      const url = `https://${NPM_REGISTRY_HOST}/lodash?version=latest`;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(true);
    });

    it('should return true for a URL with hash fragment', () => {
      const url = `https://${NPM_REGISTRY_HOST}/lodash#readme`;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(true);
    });

    it('should return true for a URL with complex path structure', () => {
      const url = `https://${NPM_REGISTRY_HOST}/@kinolanka/check-my-deps/1.0.0/dist/index.js`;

      const result = isNpmRegistryUrl(url);

      expect(result).toBe(true);
    });
  });
});
