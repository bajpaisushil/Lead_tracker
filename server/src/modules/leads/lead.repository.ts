import type {
  CreateLeadData,
  Lead,
  LeadStats,
  LeadStatus,
  ListLeadsFilter,
  PaginatedLeads,
} from './lead.types';

export interface LeadRepository {
  create(data: CreateLeadData): Promise<Lead>;
  findById(id: string): Promise<Lead | null>;
  findByEmail(email: string): Promise<Lead | null>;
  list(filter: ListLeadsFilter): Promise<PaginatedLeads>;
  updateStatus(id: string, status: LeadStatus): Promise<Lead | null>;
  stats(): Promise<LeadStats>;
}
