import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DuplicateEmailError,
  InvalidStatusTransitionError,
  NotFoundError,
} from '../../src/shared/errors';
import { InMemoryLeadRepository } from '../../src/modules/leads/lead.repository.memory';
import { LeadService } from '../../src/modules/leads/lead.service';
import type { CreateLeadInput } from '../../src/modules/leads/lead.schema';

function input(overrides: Partial<CreateLeadInput> = {}): CreateLeadInput {
  return {
    name: 'Ananya Rao',
    email: 'ananya.rao@northwind.co',
    phone: '+91 98200 11223',
    status: 'NEW',
    ...overrides,
  };
}

describe('LeadService', () => {
  let repository: InMemoryLeadRepository;
  let service: LeadService;

  beforeEach(() => {
    repository = new InMemoryLeadRepository();
    service = new LeadService(repository);
  });

  describe('createLead', () => {
    it('stores a lead and returns it with an id and timestamps', async () => {
      const lead = await service.createLead(input());

      expect(lead.id).toBeTruthy();
      expect(lead.name).toBe('Ananya Rao');
      expect(lead.status).toBe('NEW');
      expect(lead.createdAt).toBeInstanceOf(Date);
    });

    it('collapses runs of whitespace in the phone number', async () => {
      const lead = await service.createLead(input({ phone: '+91   98200    11223' }));
      expect(lead.phone).toBe('+91 98200 11223');
    });

    it('rejects a duplicate email regardless of case', async () => {
      await service.createLead(input());

      await expect(service.createLead(input({ email: 'ananya.rao@northwind.co' }))).rejects.toThrow(
        DuplicateEmailError,
      );
    });

    it('allows a second lead on a different email', async () => {
      await service.createLead(input());
      const second = await service.createLead(input({ email: 'vikram@acme.io' }));

      expect(second.id).toBeTruthy();
    });
  });

  describe('getLeadById', () => {
    it('throws NotFoundError for an unknown id', async () => {
      await expect(service.getLeadById('does-not-exist')).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateLeadStatus', () => {
    it('moves a lead one stage forward', async () => {
      const lead = await service.createLead(input());
      const updated = await service.updateLeadStatus(lead.id, 'CONTACTED');

      expect(updated.status).toBe('CONTACTED');
    });

    it('refuses a jump and reports what was allowed', async () => {
      const lead = await service.createLead(input());

      try {
        await service.updateLeadStatus(lead.id, 'WON');
        expect.unreachable('should have refused the transition');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStatusTransitionError);
        expect((error as InvalidStatusTransitionError).details).toEqual({
          from: 'NEW',
          to: 'WON',
          allowed: ['CONTACTED', 'LOST'],
        });
      }
    });

    it('short circuits when the status is already set', async () => {
      const lead = await service.createLead(input());
      const spy = vi.spyOn(repository, 'updateStatus');

      const result = await service.updateLeadStatus(lead.id, 'NEW');

      expect(result.status).toBe('NEW');
      expect(spy).not.toHaveBeenCalled();
    });

    it('throws NotFoundError before checking the transition', async () => {
      await expect(service.updateLeadStatus('missing', 'CONTACTED')).rejects.toThrow(NotFoundError);
    });
  });

  describe('listLeads', () => {
    beforeEach(async () => {
      await service.createLead(input({ name: 'Ananya Rao', email: 'ananya@northwind.co' }));
      await service.createLead(
        input({ name: 'Vikram Shetty', email: 'vikram@acme.io', phone: '9845012345' }),
      );
      await service.createLead(
        input({ name: 'Priya Nair', email: 'priya@zenith.dev', status: 'CONTACTED' }),
      );
    });

    const baseQuery = {
      page: 1,
      pageSize: 10,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    } as const;

    it('matches on a partial name', async () => {
      const { items, total } = await service.listLeads({ ...baseQuery, search: 'nair' });

      expect(total).toBe(1);
      expect(items[0]?.name).toBe('Priya Nair');
    });

    it('matches on a phone fragment', async () => {
      const { items } = await service.listLeads({ ...baseQuery, search: '98450' });
      expect(items[0]?.name).toBe('Vikram Shetty');
    });

    it('filters by status', async () => {
      const { total } = await service.listLeads({ ...baseQuery, status: ['CONTACTED'] });
      expect(total).toBe(1);
    });

    it('paginates and still reports the full total', async () => {
      const { items, total } = await service.listLeads({ ...baseQuery, pageSize: 2, page: 2 });

      expect(total).toBe(3);
      expect(items).toHaveLength(1);
    });

    it('sorts by name ascending when asked', async () => {
      const { items } = await service.listLeads({
        ...baseQuery,
        sortBy: 'name',
        sortDirection: 'asc',
      });

      expect(items.map((lead) => lead.name)).toEqual([
        'Ananya Rao',
        'Priya Nair',
        'Vikram Shetty',
      ]);
    });
  });

  describe('getStats', () => {
    it('reports null conversion until something closes', async () => {
      await service.createLead(input());
      const stats = await service.getStats();

      expect(stats.total).toBe(1);
      expect(stats.byStatus.NEW).toBe(1);
      expect(stats.conversionRate).toBeNull();
    });

    it('computes won over won plus lost', async () => {
      const won = await service.createLead(input({ email: 'won@example.com' }));
      const lost = await service.createLead(input({ email: 'lost@example.com' }));

      await service.updateLeadStatus(won.id, 'CONTACTED');
      await service.updateLeadStatus(won.id, 'QUALIFIED');
      await service.updateLeadStatus(won.id, 'WON');
      await service.updateLeadStatus(lost.id, 'LOST');

      const stats = await service.getStats();

      expect(stats.byStatus.WON).toBe(1);
      expect(stats.byStatus.LOST).toBe(1);
      expect(stats.conversionRate).toBe(0.5);
    });
  });
});
