import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { buildTestApp } from '../helpers/test-app';

describe('GET /api/health', () => {
  it('reports ok while the database is reachable', async () => {
    const { app } = buildTestApp({ databaseConnected: true });
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: 'ok', database: 'connected' });
  });

  it('fails the check when the database is down so the platform notices', async () => {
    const { app } = buildTestApp({ databaseConnected: false });
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body.data).toMatchObject({ status: 'degraded', database: 'disconnected' });
  });
});
