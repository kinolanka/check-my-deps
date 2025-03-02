import OutputService from '@/services/output-service';

export type ServiceCtxType = { cwd: string; outputService: OutputService };

class ServiceCtx {
  private _cwd: string;

  private _outputService: ServiceCtxType['outputService'];

  constructor({ cwd, outputService }: ServiceCtxType) {
    this._cwd = cwd;
    this._outputService = outputService;
  }

  get cwd(): string {
    return this._cwd;
  }

  get outputService(): ServiceCtxType['outputService'] {
    return this._outputService;
  }
}

export default ServiceCtx;
