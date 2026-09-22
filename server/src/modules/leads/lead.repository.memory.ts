import { DuplicateEmailError } from '../../shared/errors';
import type { LeadRepository } from './lead.repository';
import {
  type CreateLeadData,
  type Lead,
  type LeadSortField,
  type LeadStats,
  type LeadStatus,
  type ListLeadsFilter,
  type PaginatedLeads,
  emptyStatusCounts,
} from './lead.types';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function compareBy(a: Lead, b: Lead, field: LeadSortField): number {
  switch (field) {
    case 'createdAt':
      return a.createdAt.getTime() - b.createdAt.getTime();
    case 'updatedAt':
      return a.updatedAt.getTime() - b.updatedAt.getTime();
    case 'name':
      return a.name.localeCompare(b.name);
    case 'status':
      return a.status.localeCompare(b.status);
  }
}

function matchesSearch(lead: Lead, search: string): boolean {
  const needle = search.toLowerCase();
  return (
    lead.name.toLowerCase().includes(needle) ||
    lead.email.toLowerCase().includes(needle) ||
    lead.phone.toLowerCase().includes(needle)
  );
}

export class InMemoryLeadRepository implements LeadRepository {
  private readonly leads = new Map<string, Lead>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return this.sequence.toString(16).padStart(24, '0');
  }

  async create(data: CreateLeadData): Promise<Lead> {
    const existing = await this.findByEmail(data.email);
    if (existing) throw new DuplicateEmailError(data.email);

    const now = new Date();
    const lead: Lead = {
      id: this.nextId(),
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      status: data.status,
      createdAt: now,
      updatedAt: now,
    };

    this.leads.set(lead.id, lead);
    return { ...lead };
  }

  async findById(id: string): Promise<Lead | null> {
    const lead = this.leads.get(id);
    return lead ? { ...lead } : null;
  }

  async findByEmail(email: string): Promise<Lead | null> {
    const needle = email.toLowerCase();
    for (const lead of this.leads.values()) {
      if (lead.email === needle) return { ...lead };
    }
    return null;
  }

  async list(filter: ListLeadsFilter): Promise<PaginatedLeads> {
    let rows = [...this.leads.values()];

    if (filter.status && filter.status.length > 0) {
      const wanted = new Set(filter.status);
      rows = rows.filter((lead) => wanted.has(lead.status));
    }

    if (filter.search) {
      rows = rows.filter((lead) => matchesSearch(lead, filter.search as string));
    }

    const direction = filter.sortDirection === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const result = compareBy(a, b, filter.sortBy);
      return (result !== 0 ? result : a.id.localeCompare(b.id)) * direction;
    });

    const start = (filter.page - 1) * filter.pageSize;

    return {
      items: rows.slice(start, start + filter.pageSize).map((lead) => ({ ...lead })),
      total: rows.length,
    };
  }

  async updateStatus(id: string, status: LeadStatus): Promise<Lead | null> {
    const lead = this.leads.get(id);
    if (!lead) return null;

    const updated: Lead = { ...lead, status, updatedAt: new Date() };
    this.leads.set(id, updated);
    return { ...updated };
  }

  async stats(): Promise<LeadStats> {
    const rows = [...this.leads.values()];
    const byStatus = emptyStatusCounts();

    for (const lead of rows) {
      byStatus[lead.status] += 1;
    }

    const closed = byStatus.WON + byStatus.LOST;
    const since = Date.now() - SEVEN_DAYS_MS;

    return {
      total: rows.length,
      byStatus,
      conversionRate: closed === 0 ? null : byStatus.WON / closed,
      createdLast7Days: rows.filter((lead) => lead.createdAt.getTime() >= since).length,
    };
  }

  reset(): void {
    this.leads.clear();
    this.sequence = 0;
  }
}
