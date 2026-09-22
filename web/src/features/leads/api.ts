import { apiClient } from '@/lib/api-client';
import type {
  CreateLeadPayload,
  Lead,
  LeadQuery,
  LeadStats,
  LeadStatus,
  PageMeta,
} from '@/types/lead';

interface Envelope<T> {
  data: T;
}

interface PaginatedEnvelope<T> extends Envelope<T[]> {
  meta: PageMeta;
}

export interface LeadListResult {
  leads: Lead[];
  meta: PageMeta;
}

export function buildLeadSearchParams(query: LeadQuery): string {
  const params = new URLSearchParams();

  if (query.search.trim()) params.set('search', query.search.trim());
  if (query.status.length > 0) params.set('status', query.status.join(','));

  params.set('page', String(query.page));
  params.set('pageSize', String(query.pageSize));
  params.set('sortBy', query.sortBy);
  params.set('sortDirection', query.sortDirection);

  return params.toString();
}

export async function fetchLeads(query: LeadQuery): Promise<LeadListResult> {
  const response = await apiClient.get<PaginatedEnvelope<Lead>>(
    `/api/leads?${buildLeadSearchParams(query)}`,
  );

  return { leads: response.data, meta: response.meta };
}

export async function createLead(payload: CreateLeadPayload): Promise<Lead> {
  const response = await apiClient.post<Envelope<Lead>>('/api/leads', payload);
  return response.data;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead> {
  const response = await apiClient.patch<Envelope<Lead>>(`/api/leads/${id}/status`, { status });
  return response.data;
}

export async function fetchLeadStats(): Promise<LeadStats> {
  const response = await apiClient.get<Envelope<LeadStats>>('/api/leads/stats');
  return response.data;
}
