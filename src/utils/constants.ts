/**
 * @fileoverview Defines application-wide constants used throughout the check-my-deps package.
 *
 * This module centralizes all constant values used across the application, including:
 * - URLs for the project's web presence (website, npm, GitHub)
 * - Package identification information
 * - Other application-wide static values
 *
 * Centralizing constants in this file makes it easier to maintain and update
 * values that might change across releases, while ensuring consistency
 * throughout the codebase.
 */

/**
 * Website URL for the current package
 */
export const THIS_PACKAGE_WEBSITE_URL = 'https://checkmydeps.com';

/**
 * NPM URL for the current package
 */
export const THIS_PACKAGE_NPM_URL = 'https://www.npmjs.com/package/@kinolanka/check-my-deps';

/**
 * GitHub URL for the current package
 */
export const THIS_PACKAGE_GITHUB_URL = 'https://github.com/kinolanka/check-my-deps';

/**
 * Package name for the current package
 */
export const THIS_PACKAGE_NAME = '@kinolanka/check-my-deps';

/**
 * Name of the package file
 */
export const PACKAGE_FILE_NAME = 'package.json';

/**
 * Name of the package lock file
 */
export const PACKAGE_LOCK_FILE_NAME = 'package-lock.json';
