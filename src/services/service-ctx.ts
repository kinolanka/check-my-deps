import OutputService from '@/services/output-service';

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
