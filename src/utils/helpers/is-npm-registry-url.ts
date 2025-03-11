/**
 * Checks if a given string is a URL with the npm registry host.
 *
 * This function validates whether a string represents a URL that points to the
 * npm registry. It checks both the protocol (https) and the host (registry.npmjs.org).
 *
 * @param {string} url - The URL string to check
 * @returns {boolean} True if the URL is an npm registry URL, false otherwise
 * @example
 * // Returns true
 * isNpmRegistryUrl('https://registry.npmjs.org/lodash')
 *
 * // Returns false
 * isNpmRegistryUrl('https://www.npmjs.com/package/lodash')
 */
import { NPM_REGISTRY_HOST } from '@/utils/constants';

const isNpmRegistryUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsedUrl = new URL(url);

    // Check if the host matches the npm registry host
    return parsedUrl.host === NPM_REGISTRY_HOST;
  } catch (error) {
    // If URL parsing fails, it's not a valid URL
    return false;
  }
};

export default isNpmRegistryUrl;
