import OutputService from '@/services/output-service';

export type ServiceCtxType = {
  cwd: string;
  outputService: OutputService;
  outputDir?: string;
  silent?: boolean;
};

class ServiceCtx {
  private _cwd: string;
  private _outputService: ServiceCtxType['outputService'];
  private _outputDir: string;
  private _silent: boolean;

  constructor({ cwd, outputService, outputDir, silent = false }: ServiceCtxType) {
    this._cwd = cwd;
    this._outputService = outputService;
    // Ensure outputDir is always a string by using cwd as fallback
    this._outputDir = outputDir || cwd;
    this._silent = silent;
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
}

export default ServiceCtx;
