/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * @fileoverview Tests for PackageInfoService class, specifically testing the latest version detection logic.
 */

import PackageInfoService from '@/services/package-info-service';
import type { ServiceCtxType } from '@/services/service-ctx';
import type { NpmRegistryPackageData, PackageSpec } from '@/utils/types';

// Mock the service context
const mockCtx: ServiceCtxType = {
  outputService: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    debug: jest.fn(),
  },
} as any;

describe('PackageInfoService', () => {
  describe('setLatestVersion logic', () => {
    const createMockPackage = (packageName: string): PackageSpec => ({
      packageName,
      dependencyType: 'dependencies',
      versionRequired: '^1.0.0',
    });

    const createMockNpmData = (
      overrides: Partial<NpmRegistryPackageData> = {}
    ): NpmRegistryPackageData => ({
      name: 'test-package',
      version: '2.1.0', // Add required version property
      'dist-tags': {
        latest: '2.1.0',
      },
      versions: {
        '1.0.0': { version: '1.0.0' },
        '1.1.0': { version: '1.1.0' },
        '2.0.0': { version: '2.0.0' },
        '2.1.0': { version: '2.1.0' },
        '9999.0.1': { version: '9999.0.1' }, // Mistakenly high version
      } as any, // Type assertion for test simplicity
      time: {
        '1.0.0': '2023-01-01T00:00:00.000Z',
        '1.1.0': '2023-02-01T00:00:00.000Z',
        '2.0.0': '2023-03-01T00:00:00.000Z',
        '2.1.0': '2023-04-01T00:00:00.000Z',
        '9999.0.1': '2023-05-01T00:00:00.000Z',
      },
      ...overrides,
    });

    it('should use dist-tags.latest when available and valid', () => {
      const mockPackage = createMockPackage('test-package');

      const mockNpmData = createMockNpmData();

      const service = new PackageInfoService(
        { package: mockPackage, npmRegistryData: mockNpmData },
        mockCtx
      );

      const spec = service.getSpec();

      // Should use dist-tags.latest (2.1.0) instead of numerically highest (9999.0.1)
      expect(spec.versionLast?.version).toBe('2.1.0');
    });

    it('should fallback to numeric sorting when dist-tags.latest is missing', () => {
      const mockPackage = createMockPackage('test-package');

      const mockNpmData = createMockNpmData({
        'dist-tags': {}, // No latest tag
      });

      const service = new PackageInfoService(
        { package: mockPackage, npmRegistryData: mockNpmData },
        mockCtx
      );

      const spec = service.getSpec();

      // Should fallback to numerically highest (9999.0.1)
      expect(spec.versionLast?.version).toBe('9999.0.1');
    });

    it('should fallback to numeric sorting when dist-tags.latest is a pre-release version', () => {
      const mockPackage = createMockPackage('test-package');

      const mockNpmData = createMockNpmData({
        'dist-tags': {
          latest: '3.0.0-beta.1', // Pre-release version
        },
        versions: {
          '1.0.0': { version: '1.0.0' },
          '2.1.0': { version: '2.1.0' },
          '9999.0.1': { version: '9999.0.1' },
          '3.0.0-beta.1': { version: '3.0.0-beta.1' },
        } as any,
        time: {
          '1.0.0': '2023-01-01T00:00:00.000Z',
          '2.1.0': '2023-04-01T00:00:00.000Z',
          '9999.0.1': '2023-05-01T00:00:00.000Z',
          '3.0.0-beta.1': '2023-06-01T00:00:00.000Z',
        },
      });

      const service = new PackageInfoService(
        { package: mockPackage, npmRegistryData: mockNpmData },
        mockCtx
      );

      const spec = service.getSpec();

      // Should fallback to numerically highest production version (9999.0.1)
      expect(spec.versionLast?.version).toBe('9999.0.1');
    });

    it('should fallback to numeric sorting when dist-tags.latest version does not exist in versions object', () => {
      const mockPackage = createMockPackage('test-package');

      const mockNpmData = createMockNpmData({
        'dist-tags': {
          latest: '5.0.0', // Version not in versions object
        },
        versions: {
          '1.0.0': { version: '1.0.0' },
          '2.1.0': { version: '2.1.0' },
          '9999.0.1': { version: '9999.0.1' },
        } as any,
      });

      const service = new PackageInfoService(
        { package: mockPackage, npmRegistryData: mockNpmData },
        mockCtx
      );

      const spec = service.getSpec();

      // Should fallback to numerically highest (9999.0.1)
      expect(spec.versionLast?.version).toBe('9999.0.1');
    });

    it('should handle cases where no npm registry data is available', () => {
      const mockPackage = createMockPackage('test-package');

      const service = new PackageInfoService(
        { package: mockPackage }, // No npmRegistryData
        mockCtx
      );

      const spec = service.getSpec();

      // Should not have versionLast when no registry data
      expect(spec.versionLast).toBeUndefined();
    });

    it('should handle malformed dist-tags gracefully', () => {
      const mockPackage = createMockPackage('test-package');

      const mockNpmData = createMockNpmData({
        'dist-tags': undefined as any, // Malformed dist-tags
      });

      const service = new PackageInfoService(
        { package: mockPackage, npmRegistryData: mockNpmData },
        mockCtx
      );

      const spec = service.getSpec();

      // Should fallback to numeric sorting
      expect(spec.versionLast?.version).toBe('9999.0.1');
    });

    it('should work correctly with real-world nx package scenario', () => {
      const mockPackage = createMockPackage('nx');

      const mockNpmData = createMockNpmData({
        'dist-tags': {
          latest: '21.2.2',
        },
        versions: {
          '10.3.0': { version: '10.3.0' },
          '21.2.2': { version: '21.2.2' },
          '9999.0.1': { version: '9999.0.1' }, // Mistakenly high version
        } as any,
        time: {
          '10.3.0': '2023-01-01T00:00:00.000Z',
          '21.2.2': '2023-04-01T00:00:00.000Z',
          '9999.0.1': '2023-05-01T00:00:00.000Z',
        },
      });

      const service = new PackageInfoService(
        { package: mockPackage, npmRegistryData: mockNpmData },
        mockCtx
      );

      const spec = service.getSpec();

      // Should use dist-tags.latest (21.2.2) instead of numerically highest (9999.0.1)
      expect(spec.versionLast?.version).toBe('21.2.2');
    });

    it('should properly set all version properties when using dist-tags.latest', () => {
      const mockPackage = createMockPackage('test-package');

      const mockNpmData = createMockNpmData();

      const service = new PackageInfoService(
        { package: mockPackage, npmRegistryData: mockNpmData },
        mockCtx
      );

      const spec = service.getSpec();

      expect(spec.versionLast).toBeDefined();

      expect(spec.versionLast?.version).toBe('2.1.0');

      expect(spec.versionLast?.releaseDate).toBeDefined();

      expect(spec.versionLast?.npmUrl).toContain('npm');

      expect(spec.versionLast?.deprecated).toBeDefined();

      expect(spec.versionLast?.timeSinceRelease).toBeDefined();

      expect(spec.versionLast?.timeUnit).toBeDefined();
    });
  });
});
