import type { Express } from 'express';

import { createApp } from '../../src/app';
import { InMemoryLeadRepository } from '../../src/modules/leads';

export interface TestContext {
  app: Express;
  repository: InMemoryLeadRepository;
}

export function buildTestApp(options: { databaseConnected?: boolean } = {}): TestContext {
  const repository = new InMemoryLeadRepository();
  const app = createApp({
    leadRepository: repository,
    checkDatabase: () => options.databaseConnected ?? true,
  });

  return { app, repository };
}

export function leadPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Ananya Rao',
    email: 'ananya.rao@northwind.co',
    phone: '+91 98200 11223',
    ...overrides,
  };
}
