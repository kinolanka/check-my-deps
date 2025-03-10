/**
 * @fileoverview Provides the ServiceCtx class that serves as a context container for services.
 *
 * This module defines a context object that holds common configuration and dependencies
 * shared across various services in the application. It centralizes access to:
 * - Working directory path
 * - Output directory path
 * - Output service for logging and user feedback
 * - Silent mode flag
 * - Force overwrite flag for export operations
 *
 * Services can access these shared resources through a single context object,
 * promoting cleaner dependency injection and easier testing.
 */

import type OutputService from '@/services/output-service';

export type ServiceCtxType = {
  cwd: string;
  outputService: OutputService;
  outputDir?: string;
  silent?: boolean;
  forceOverwrite?: boolean;
};

class ServiceCtx {
  private _cwd: string;
  private _outputService: ServiceCtxType['outputService'];
  private _outputDir: string;
  private _silent: boolean;
  private _forceOverwrite: boolean;

  constructor({
    cwd,
    outputService,
    outputDir,
    silent = false,
    forceOverwrite = false,
  }: ServiceCtxType) {
    this._cwd = cwd;

    this._outputService = outputService;

    // Ensure outputDir is always a string by using cwd as fallback
    this._outputDir = outputDir || cwd;

    this._silent = silent;

    this._forceOverwrite = forceOverwrite;
  }

  get cwd(): string {
    return this._cwd;
  }

  get outputService(): ServiceCtxType['outputService'] {
    return this._outputService;
  }

  get outputDir(): string {
    return this._outputDir;
  }

  get silent(): boolean {
    return this._silent;
  }

  get forceOverwrite(): boolean {
    return this._forceOverwrite;
  }
}

export default ServiceCtx;
