import OutputService from '@/services/output-service';

export type ServiceCtxType = {
  cwd: string;
  outputService: OutputService;
  outputDir?: string;
};

class ServiceCtx {
  private _cwd: string;
  private _outputService: ServiceCtxType['outputService'];
  private _outputDir: string;

  constructor({ cwd, outputService, outputDir }: ServiceCtxType) {
    this._cwd = cwd;
    this._outputService = outputService;
    // Ensure outputDir is always a string by using cwd as fallback
    this._outputDir = outputDir || cwd;
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
}

export default ServiceCtx;
