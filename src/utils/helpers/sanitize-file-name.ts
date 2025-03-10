/**
 * Sanitizes a string to be used as a valid file name by removing special characters
 * and replacing them with hyphens.
 *
 * @param {string} name - The string to sanitize
 * @returns {string} A sanitized string suitable for use as a file name
 * @example
 * // Returns 'react-dom-18-2-0'
 * sanitizeFileName('@react/dom@18.2.0')
 *
 * // Returns 'my-package-name'
 * sanitizeFileName('My Package Name!')
 */
const sanitizeFileName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/@/g, '')
    .replace(/[^a-z0-9]/g, '-');
};

export default sanitizeFileName;
