import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildLeadSearchParams } from '@/features/leads/api';
import { ApiError, apiClient } from '@/lib/api-client';
import type { LeadQuery } from '@/types/lead';

const baseQuery: LeadQuery = {
  search: '',
  status: [],
  page: 1,
  pageSize: 10,
  sortBy: 'createdAt',
  sortDirection: 'desc',
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('buildLeadSearchParams', () => {
  it('omits an empty search and status filter', () => {
    const params = buildLeadSearchParams(baseQuery);

    expect(params).not.toContain('search');
    expect(params).not.toContain('status');
    expect(params).toContain('page=1');
  });

  it('trims the search term', () => {
    expect(buildLeadSearchParams({ ...baseQuery, search: '  nair  ' })).toContain('search=nair');
  });

  it('joins statuses with a comma', () => {
    const params = buildLeadSearchParams({ ...baseQuery, status: ['NEW', 'WON'] });
    expect(decodeURIComponent(params)).toContain('status=NEW,WON');
  });
});

describe('apiClient', () => {
  it('unwraps a successful response', async () => {
    mockFetch(200, { data: { id: '1' } });
    await expect(apiClient.get('/api/leads/1')).resolves.toEqual({ data: { id: '1' } });
  });

  it('turns an error envelope into an ApiError carrying the code', async () => {
    mockFetch(409, {
      error: { code: 'DUPLICATE_EMAIL', message: 'A lead with that email already exists' },
    });

    await expect(apiClient.post('/api/leads', {})).rejects.toMatchObject({
      status: 409,
      code: 'DUPLICATE_EMAIL',
    });
  });

  it('exposes validation issues per field', async () => {
    mockFetch(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request payload is invalid',
        details: [{ field: 'email', message: 'Enter a valid email address' }],
      },
    });

    try {
      await apiClient.post('/api/leads', {});
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).fieldIssues).toEqual([
        { field: 'email', message: 'Enter a valid email address' },
      ]);
    }
  });

  it('returns no field issues for a non validation error', async () => {
    mockFetch(500, { error: { code: 'INTERNAL_ERROR', message: 'boom' } });

    await expect(apiClient.get('/api/leads')).rejects.toSatisfy(
      (error: unknown) => error instanceof ApiError && error.fieldIssues.length === 0,
    );
  });

  it('reports a transport failure as NETWORK_ERROR instead of leaking TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiClient.get('/api/leads')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });

  it('falls back to a status based message when the body is not json', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error('not json');
        },
      }),
    );

    await expect(apiClient.get('/api/leads')).rejects.toThrow(/502/);
  });
});
