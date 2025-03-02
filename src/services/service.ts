import { ServiceCtxType } from '@/services/service-ctx';

export type ServiceType = ServiceCtxType;

class Service {
  protected ctx: ServiceCtxType;

  constructor(ctx: ServiceType) {
    this.ctx = ctx;
  }
}

export default Service;
