import { describe, expect, it } from 'vitest';

import {
  createLeadSchema,
  listLeadsQuerySchema,
  updateLeadStatusSchema,
} from '../../src/modules/leads/lead.schema';

describe('createLeadSchema', () => {
  it('trims the name and lowercases the email', () => {
    const parsed = createLeadSchema.parse({
      name: '  Ananya Rao  ',
      email: '  Ananya.RAO@Northwind.co ',
      phone: '+91 98200 11223',
    });

    expect(parsed.name).toBe('Ananya Rao');
    expect(parsed.email).toBe('ananya.rao@northwind.co');
  });

  it('defaults a new lead to NEW', () => {
    const parsed = createLeadSchema.parse({
      name: 'Vikram Shetty',
      email: 'vikram@acme.io',
      phone: '9845012345',
    });

    expect(parsed.status).toBe('NEW');
  });

  it.each([
    ['+1 (415) 555-0142'],
    ['9845012345'],
    ['+91 98200 11223'],
    ['020-7946-0958'],
  ])('accepts %s as a phone number', (phone) => {
    expect(() =>
      createLeadSchema.parse({ name: 'Test User', email: 't@example.com', phone }),
    ).not.toThrow();
  });

  it.each([
    ['A', 'name too short'],
    ['', 'name empty'],
  ])('rejects the name %s', (name) => {
    const result = createLeadSchema.safeParse({
      name,
      email: 'test@example.com',
      phone: '9845012345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed email', () => {
    const result = createLeadSchema.safeParse({
      name: 'Test User',
      email: 'not-an-email',
      phone: '9845012345',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Enter a valid email address');
  });

  it('rejects letters in a phone number', () => {
    const result = createLeadSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      phone: 'call-me-later',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a phone with too few digits', () => {
    const result = createLeadSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      phone: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('reports every invalid field at once rather than stopping at the first', () => {
    const result = createLeadSchema.safeParse({ name: 'A', email: 'nope', phone: '1' });

    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'phone']));
  });
});

describe('updateLeadStatusSchema', () => {
  it('accepts a known status', () => {
    expect(updateLeadStatusSchema.parse({ status: 'QUALIFIED' }).status).toBe('QUALIFIED');
  });

  it('lists the valid options when given an unknown one', () => {
    const result = updateLeadStatusSchema.safeParse({ status: 'PENDING' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain('NEW, CONTACTED, QUALIFIED, WON, LOST');
  });
});

describe('listLeadsQuerySchema', () => {
  it('applies sensible defaults for an empty query', () => {
    expect(listLeadsQuerySchema.parse({})).toEqual({
      search: undefined,
      status: undefined,
      page: 1,
      pageSize: 10,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
  });

  it('coerces numeric query strings', () => {
    const parsed = listLeadsQuerySchema.parse({ page: '3', pageSize: '25' });
    expect(parsed.page).toBe(3);
    expect(parsed.pageSize).toBe(25);
  });

  it('caps pageSize so nobody can pull the whole collection', () => {
    expect(listLeadsQuerySchema.safeParse({ pageSize: '5000' }).success).toBe(false);
  });

  it('parses a comma separated status filter', () => {
    expect(listLeadsQuerySchema.parse({ status: 'NEW,WON' }).status).toEqual(['NEW', 'WON']);
  });

  it('parses a repeated status filter', () => {
    expect(listLeadsQuerySchema.parse({ status: ['new', 'contacted'] }).status).toEqual([
      'NEW',
      'CONTACTED',
    ]);
  });

  it('treats an empty search string as no filter', () => {
    expect(listLeadsQuerySchema.parse({ search: '   ' }).search).toBeUndefined();
  });

  it('rejects an unknown sort field', () => {
    expect(listLeadsQuerySchema.safeParse({ sortBy: 'revenue' }).success).toBe(false);
  });
});
