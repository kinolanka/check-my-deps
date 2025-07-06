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

      const spec = service.getInfo();

      // Should use dist-tags.latest (2.1.0) instead of numerically highest (9999.0.1)
      expect(spec.versionLastMajor?.version).toBe('2.1.0');
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

      const spec = service.getInfo();

      // Should fallback to numerically highest (9999.0.1)
      expect(spec.versionLastMajor?.version).toBe('9999.0.1');
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

      const spec = service.getInfo();

      // Should fallback to numerically highest production version (9999.0.1)
      expect(spec.versionLastMajor?.version).toBe('9999.0.1');
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

      const spec = service.getInfo();

      // Should fallback to numerically highest (9999.0.1)
      expect(spec.versionLastMajor?.version).toBe('9999.0.1');
    });

    it('should handle cases where no npm registry data is available', () => {
      const mockPackage = createMockPackage('test-package');

      const service = new PackageInfoService(
        { package: mockPackage }, // No npmRegistryData
        mockCtx
      );

      const spec = service.getInfo();

      // Should not have versionLastMajor when no registry data
      expect(spec.versionLastMajor).toBeUndefined();
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

      const spec = service.getInfo();

      // Should fallback to numeric sorting
      expect(spec.versionLastMajor?.version).toBe('9999.0.1');
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

      const spec = service.getInfo();

      // Should use dist-tags.latest (21.2.2) instead of numerically highest (9999.0.1)
      expect(spec.versionLastMajor?.version).toBe('21.2.2');
    });

    it('should properly set all version properties when using dist-tags.latest', () => {
      const mockPackage = createMockPackage('test-package');

      const mockNpmData = createMockNpmData();

      const service = new PackageInfoService(
        { package: mockPackage, npmRegistryData: mockNpmData },
        mockCtx
      );

      const spec = service.getInfo();

      expect(spec.versionLastMajor).toBeDefined();

      expect(spec.versionLastMajor?.version).toBe('2.1.0');

      expect(spec.versionLastMajor?.releaseDate).toBeDefined();

      expect(spec.versionLastMajor?.npmUrl).toContain('npm');

      expect(spec.versionLastMajor?.deprecated).toBeDefined();

      expect(spec.versionLastMajor?.timeSinceRelease).toBeDefined();

      expect(spec.versionLastMajor?.timeUnit).toBeDefined();
    });

    describe('Pre-release version handling', () => {
      const createMockListDepItem = (version: string) => ({
        version,
        resolved: `https://registry.npmjs.org/test-package/-/test-package-${version}.tgz`,
      });

      it('should find newer pre-release in same major.minor range when installed is pre-release', () => {
        const mockPackage = createMockPackage('next-auth');

        const mockNpmData = createMockNpmData({
          'dist-tags': {
            latest: '4.24.11', // Lower production version
            beta: '5.0.0-beta.29',
          },
          versions: {
            '4.24.11': { version: '4.24.11' },
            '5.0.0-beta.26': { version: '5.0.0-beta.26' },
            '5.0.0-beta.29': { version: '5.0.0-beta.29' },
            '5.1.0-beta.2': { version: '5.1.0-beta.2' },
          } as any,
          time: {
            '4.24.11': '2023-01-01T00:00:00.000Z',
            '5.0.0-beta.26': '2023-02-01T00:00:00.000Z',
            '5.0.0-beta.29': '2023-03-01T00:00:00.000Z',
            '5.1.0-beta.2': '2023-04-01T00:00:00.000Z',
          },
        });

        const mockListDepItem = createMockListDepItem('5.0.0-beta.26');

        const service = new PackageInfoService(
          { package: mockPackage, npmListDepItem: mockListDepItem, npmRegistryData: mockNpmData },
          mockCtx
        );

        const spec = service.getInfo();

        // versionLastMajor should be the latest production version
        expect(spec.versionLastMajor?.version).toBe('4.24.11');

        // versionLastPatch should find 5.0.0-beta.29 (same 5.0.x range) instead of 5.1.0-beta.2
        expect(spec.versionLastPatch?.version).toBe('5.0.0-beta.29');

        expect(spec.updateStatus).toBe('patch'); // beta.26 → beta.29 treated as patch
      });

      it('should handle pre-release to production version comparison correctly', () => {
        const mockPackage = createMockPackage('some-package');

        const mockNpmData = createMockNpmData({
          'dist-tags': {
            latest: '6.0.0', // Higher production version
          },
          versions: {
            '5.0.0-beta.26': { version: '5.0.0-beta.26' },
            '6.0.0': { version: '6.0.0' },
          } as any,
          time: {
            '5.0.0-beta.26': '2023-02-01T00:00:00.000Z',
            '6.0.0': '2023-03-01T00:00:00.000Z',
          },
        });

        const mockListDepItem = createMockListDepItem('5.0.0-beta.26');

        const service = new PackageInfoService(
          { package: mockPackage, npmListDepItem: mockListDepItem, npmRegistryData: mockNpmData },
          mockCtx
        );

        const spec = service.getInfo();

        // Should use production version 6.0.0 since it's higher
        expect(spec.versionLastMajor?.version).toBe('6.0.0');

        expect(spec.updateStatus).toBe('major'); // 5.x → 6.x is major
      });

      it('should treat same base version pre-release updates as patch', () => {
        const mockPackage = createMockPackage('test-package');

        const mockNpmData = createMockNpmData({
          'dist-tags': {
            latest: '2.0.0',
            beta: '3.0.0-beta.5',
          },
          versions: {
            '2.0.0': { version: '2.0.0' },
            '3.0.0-beta.3': { version: '3.0.0-beta.3' },
            '3.0.0-beta.5': { version: '3.0.0-beta.5' },
          } as any,
          time: {
            '2.0.0': '2023-01-01T00:00:00.000Z',
            '3.0.0-beta.3': '2023-02-01T00:00:00.000Z',
            '3.0.0-beta.5': '2023-03-01T00:00:00.000Z',
          },
        });

        const mockListDepItem = createMockListDepItem('3.0.0-beta.3');

        const service = new PackageInfoService(
          { package: mockPackage, npmListDepItem: mockListDepItem, npmRegistryData: mockNpmData },
          mockCtx
        );

        const spec = service.getInfo();

        // versionLastMajor should be the latest production version
        expect(spec.versionLastMajor?.version).toBe('2.0.0');

        // versionLastPatch should find 3.0.0-beta.5 (newer pre-release)
        expect(spec.versionLastPatch?.version).toBe('3.0.0-beta.5');

        expect(spec.updateStatus).toBe('patch'); // Same base version (3.0.0), different pre-release
      });

      it('should handle cross-minor pre-release versions correctly', () => {
        const mockPackage = createMockPackage('test-package');

        const mockNpmData = createMockNpmData({
          'dist-tags': {
            latest: '2.0.0',
          },
          versions: {
            '2.0.0': { version: '2.0.0' },
            '5.0.0-beta.26': { version: '5.0.0-beta.26' },
            '5.1.0-beta.2': { version: '5.1.0-beta.2' },
          } as any,
          time: {
            '2.0.0': '2023-01-01T00:00:00.000Z',
            '5.0.0-beta.26': '2023-02-01T00:00:00.000Z',
            '5.1.0-beta.2': '2023-03-01T00:00:00.000Z',
          },
        });

        const mockListDepItem = createMockListDepItem('5.0.0-beta.26');

        const service = new PackageInfoService(
          { package: mockPackage, npmListDepItem: mockListDepItem, npmRegistryData: mockNpmData },
          mockCtx
        );

        const spec = service.getInfo();

        // Should NOT find 5.1.0-beta.2 since it's different minor version
        // Should fall back to production version 2.0.0
        expect(spec.versionLastMajor?.version).toBe('2.0.0');

        expect(spec.updateStatus).toBe('major'); // 5.x → 2.x is major (downgrade)
      });

      it('should handle production to pre-release installation correctly', () => {
        const mockPackage = createMockPackage('test-package');

        const mockNpmData = createMockNpmData({
          'dist-tags': {
            latest: '2.1.0',
          },
          versions: {
            '1.0.0': { version: '1.0.0' },
            '2.1.0': { version: '2.1.0' },
            '2.2.0-beta.1': { version: '2.2.0-beta.1' },
          } as any,
          time: {
            '1.0.0': '2023-01-01T00:00:00.000Z',
            '2.1.0': '2023-02-01T00:00:00.000Z',
            '2.2.0-beta.1': '2023-03-01T00:00:00.000Z',
          },
        });

        const mockListDepItem = createMockListDepItem('1.0.0'); // Production installation

        const service = new PackageInfoService(
          { package: mockPackage, npmListDepItem: mockListDepItem, npmRegistryData: mockNpmData },
          mockCtx
        );

        const spec = service.getInfo();

        // Should use latest production version, not pre-release
        expect(spec.versionLastMajor?.version).toBe('2.1.0');

        expect(spec.updateStatus).toBe('major'); // 1.0 → 2.1 is major
      });

      it('should correctly sort pre-release versions with numeric identifiers', () => {
        const mockPackage = createMockPackage('next-auth');

        const mockNpmData = createMockNpmData({
          'dist-tags': {
            latest: '4.24.11', // Lower production version
          },
          versions: {
            '4.24.11': { version: '4.24.11' },
            '5.0.0-beta.9': { version: '5.0.0-beta.9' },
            '5.0.0-beta.29': { version: '5.0.0-beta.29' },
            '5.0.0-beta.26': { version: '5.0.0-beta.26' },
          } as any,
          time: {
            '4.24.11': '2023-01-01T00:00:00.000Z',
            '5.0.0-beta.9': '2023-02-01T00:00:00.000Z',
            '5.0.0-beta.26': '2023-03-01T00:00:00.000Z',
            '5.0.0-beta.29': '2023-04-01T00:00:00.000Z',
          },
        });

        const mockListDepItem = createMockListDepItem('5.0.0-beta.26');

        const service = new PackageInfoService(
          { package: mockPackage, npmListDepItem: mockListDepItem, npmRegistryData: mockNpmData },
          mockCtx
        );

        const spec = service.getInfo();

        // versionLastMajor should be the latest production version
        expect(spec.versionLastMajor?.version).toBe('4.24.11');

        // versionLastPatch should find 5.0.0-beta.29 (highest beta), not 5.0.0-beta.9
        expect(spec.versionLastPatch?.version).toBe('5.0.0-beta.29');

        expect(spec.updateStatus).toBe('patch'); // beta.26 → beta.29 treated as patch
      });

      it('should use publication date for pre-release sorting regardless of tag format', () => {
        const mockPackage = createMockPackage('test-package');

        const mockNpmData = createMockNpmData({
          'dist-tags': {
            latest: '1.0.0',
          },
          versions: {
            '1.0.0': { version: '1.0.0' },
            '2.0.0-alpha': { version: '2.0.0-alpha' },
            '2.0.0-canary.5': { version: '2.0.0-canary.5' },
            '2.0.0-canary.1': { version: '2.0.0-canary.1' },
            '2.0.0-beta': { version: '2.0.0-beta' },
            '2.0.0-rc': { version: '2.0.0-rc' },
          } as any,
          time: {
            '1.0.0': '2023-01-01T00:00:00.000Z',
            '2.0.0-alpha': '2023-02-01T00:00:00.000Z',
            '2.0.0-canary.5': '2023-02-15T00:00:00.000Z', // Note: canary.5 comes before canary.1 chronologically
            '2.0.0-canary.1': '2023-03-01T00:00:00.000Z',
            '2.0.0-beta': '2023-03-15T00:00:00.000Z',
            '2.0.0-rc': '2023-04-01T00:00:00.000Z', // Latest by date
          },
        });

        const mockListDepItem = createMockListDepItem('2.0.0-alpha');

        const service = new PackageInfoService(
          { package: mockPackage, npmListDepItem: mockListDepItem, npmRegistryData: mockNpmData },
          mockCtx
        );

        const spec = service.getInfo();

        // versionLastMajor should be the latest production version
        expect(spec.versionLastMajor?.version).toBe('1.0.0');

        // versionLastPatch should find 2.0.0-rc (latest by publication date), not canary.5 (highest numerically)
        expect(spec.versionLastPatch?.version).toBe('2.0.0-rc');

        expect(spec.updateStatus).toBe('patch'); // Same base version (2.0.0)
      });
    });
  });
});
