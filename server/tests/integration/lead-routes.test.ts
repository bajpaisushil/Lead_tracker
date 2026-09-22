import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildTestApp, leadPayload } from '../helpers/test-app';

describe('lead routes', () => {
  let app: Express;

  beforeEach(() => {
    app = buildTestApp().app;
  });

  async function seed(overrides: Record<string, unknown> = {}): Promise<string> {
    const response = await request(app).post('/api/leads').send(leadPayload(overrides));
    return response.body.data.id as string;
  }

  describe('POST /api/leads', () => {
    it('creates a lead and points Location at it', async () => {
      const response = await request(app).post('/api/leads').send(leadPayload());

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: 'Ananya Rao',
        email: 'ananya.rao@northwind.co',
        status: 'NEW',
      });
      expect(response.headers.location).toBe(`/api/leads/${response.body.data.id}`);
    });

    it('returns 400 with a message per invalid field', async () => {
      const response = await request(app)
        .post('/api/leads')
        .send({ name: 'A', email: 'nope', phone: '1' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');

      const fields = response.body.error.details.map((issue: { field: string }) => issue.field);
      expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'phone']));
    });

    it('returns 409 on a duplicate email', async () => {
      await seed();
      const response = await request(app).post('/api/leads').send(leadPayload());

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('ignores fields the client is not allowed to set', async () => {
      const response = await request(app)
        .post('/api/leads')
        .send(leadPayload({ id: 'injected', createdAt: '1999-01-01T00:00:00.000Z' }));

      expect(response.status).toBe(201);
      expect(response.body.data.id).not.toBe('injected');
      expect(new Date(response.body.data.createdAt).getFullYear()).toBeGreaterThan(2020);
    });
  });

  describe('GET /api/leads', () => {
    beforeEach(async () => {
      await seed({ name: 'Ananya Rao', email: 'ananya@northwind.co' });
      await seed({ name: 'Vikram Shetty', email: 'vikram@acme.io', phone: '9845012345' });
      await seed({ name: 'Priya Nair', email: 'priya@zenith.dev', status: 'CONTACTED' });
    });

    it('returns leads with pagination metadata', async () => {
      const response = await request(app).get('/api/leads');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta).toMatchObject({
        page: 1,
        pageSize: 10,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('searches across name, email and phone', async () => {
      const byName = await request(app).get('/api/leads').query({ search: 'nair' });
      expect(byName.body.meta.total).toBe(1);

      const byEmail = await request(app).get('/api/leads').query({ search: 'acme' });
      expect(byEmail.body.meta.total).toBe(1);

      const byPhone = await request(app).get('/api/leads').query({ search: '98450' });
      expect(byPhone.body.meta.total).toBe(1);
    });

    it('filters by status', async () => {
      const response = await request(app).get('/api/leads').query({ status: 'CONTACTED' });

      expect(response.body.meta.total).toBe(1);
      expect(response.body.data[0].status).toBe('CONTACTED');
    });

    it('reports the next page correctly', async () => {
      const response = await request(app).get('/api/leads').query({ pageSize: 2, page: 1 });

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({ totalPages: 2, hasNextPage: true });
    });

    it('returns an empty page rather than an error when nothing matches', async () => {
      const response = await request(app).get('/api/leads').query({ search: 'zzzzz' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
      expect(response.body.meta.totalPages).toBe(0);
    });

    it('rejects an oversized pageSize', async () => {
      const response = await request(app).get('/api/leads').query({ pageSize: 5000 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/leads/:id', () => {
    it('returns a single lead', async () => {
      const id = await seed();
      const response = await request(app).get(`/api/leads/${id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(id);
    });

    it('returns 404 for an unknown id', async () => {
      const response = await request(app).get('/api/leads/000000000000000000000000');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PATCH /api/leads/:id/status', () => {
    it('advances the status', async () => {
      const id = await seed();
      const response = await request(app)
        .patch(`/api/leads/${id}/status`)
        .send({ status: 'CONTACTED' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CONTACTED');
    });

    it('returns 422 and the allowed moves when the jump is invalid', async () => {
      const id = await seed();
      const response = await request(app).patch(`/api/leads/${id}/status`).send({ status: 'WON' });

      expect(response.status).toBe(422);
      expect(response.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(response.body.error.details.allowed).toEqual(['CONTACTED', 'LOST']);
    });

    it('returns 400 for a status outside the enum', async () => {
      const id = await seed();
      const response = await request(app)
        .patch(`/api/leads/${id}/status`)
        .send({ status: 'PENDING' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for an unknown lead', async () => {
      const response = await request(app)
        .patch('/api/leads/000000000000000000000000/status')
        .send({ status: 'CONTACTED' });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/leads/stats', () => {
    it('is matched as a route, not as a lead id', async () => {
      await seed();
      const response = await request(app).get('/api/leads/stats');

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({ total: 1, conversionRate: null });
      expect(response.body.data.byStatus.NEW).toBe(1);
    });
  });

  it('returns a structured 404 for an unknown route', async () => {
    const response = await request(app).get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
