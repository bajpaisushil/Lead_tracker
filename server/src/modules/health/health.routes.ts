import { Router } from 'express';

import type { ApiSuccess } from '../../shared/types/api';

export interface HealthPayload {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export function createHealthRouter(checkDatabase: () => boolean): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const connected = checkDatabase();

    const body: ApiSuccess<HealthPayload> = {
      data: {
        status: connected ? 'ok' : 'degraded',
        uptimeSeconds: Math.round(process.uptime()),
        database: connected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      },
    };

    res.status(connected ? 200 : 503).json(body);
  });

  return router;
}
