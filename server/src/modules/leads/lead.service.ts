import {
  DuplicateEmailError,
  InvalidStatusTransitionError,
  NotFoundError,
} from '../../shared/errors';
import type { CreateLeadInput, ListLeadsQuery } from './lead.schema';
import type { LeadRepository } from './lead.repository';
import {
  type Lead,
  type LeadStats,
  type LeadStatus,
  type PaginatedLeads,
  allowedTransitionsFrom,
  canTransition,
} from './lead.types';

function normalisePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, ' ');
}

export class LeadService {
  constructor(private readonly repository: LeadRepository) {}

  async createLead(input: CreateLeadInput): Promise<Lead> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) throw new DuplicateEmailError(input.email);

    return this.repository.create({
      name: input.name,
      email: input.email,
      phone: normalisePhone(input.phone),
      status: input.status,
    });
  }

  async getLeadById(id: string): Promise<Lead> {
    const lead = await this.repository.findById(id);
    if (!lead) throw new NotFoundError('Lead', id);
    return lead;
  }

  async listLeads(query: ListLeadsQuery): Promise<PaginatedLeads> {
    return this.repository.list({
      search: query.search,
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  async updateLeadStatus(id: string, status: LeadStatus): Promise<Lead> {
    const lead = await this.getLeadById(id);

    if (!canTransition(lead.status, status)) {
      throw new InvalidStatusTransitionError(
        lead.status,
        status,
        allowedTransitionsFrom(lead.status),
      );
    }

    if (lead.status === status) return lead;

    const updated = await this.repository.updateStatus(id, status);
    if (!updated) throw new NotFoundError('Lead', id);
    return updated;
  }

  async getStats(): Promise<LeadStats> {
    return this.repository.stats();
  }
}
