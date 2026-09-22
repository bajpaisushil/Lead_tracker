import { Router } from 'express';

import { LeadController } from './lead.controller';
import type { LeadService } from './lead.service';

export function createLeadRouter(service: LeadService): Router {
  const controller = new LeadController(service);
  const router = Router();

  // /stats has to be registered before /:id or express matches it as an id.
  router.get('/stats', controller.stats);

  router.get('/', controller.list);
  router.post('/', controller.create);
  router.get('/:id', controller.getById);
  router.patch('/:id/status', controller.updateStatus);

  return router;
}
