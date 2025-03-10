/**
 * Extracts the hostname from a URL string.
 *
 * @param {string} url - The URL to extract the hostname from
 * @returns {string} The hostname if URL is valid, or the original string if parsing fails
 * @example
 * // Returns 'example.com'
 * extractRootDomain('https://example.com/path')
 *
 * // Returns 'subdomain.example.com'
 * extractRootDomain('http://subdomain.example.com')
 */
const extractRootDomain = (url: string): string => {
  try {
    const { hostname } = new URL(url);

    return hostname;
  } catch {
    return url;
  }
};

export default extractRootDomain;
