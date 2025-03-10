/**
 * @fileoverview Provides the base Service class that all service implementations extend.
 *
 * This module defines the abstract Service class that serves as the foundation
 * for all service implementations in the application. It provides:
 * - A standardized constructor that accepts a service context
 * - Protected access to the context for derived classes
 * - Type definitions for service context requirements
 *
 * By extending this base class, all services maintain a consistent interface
 * and access pattern to shared resources and configuration.
 */

import type { ServiceCtxType } from '@/services/service-ctx';

export type ServiceType = ServiceCtxType;

class Service {
  protected ctx: ServiceCtxType;

  constructor(ctx: ServiceType) {
    this.ctx = ctx;
  }
}

export default Service;
