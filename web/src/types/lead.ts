export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  conversionRate: number | null;
  createdLast7Days: number;
}

export type LeadSortField = 'createdAt' | 'updatedAt' | 'name' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface LeadQuery {
  search: string;
  status: LeadStatus[];
  page: number;
  pageSize: number;
  sortBy: LeadSortField;
  sortDirection: SortDirection;
}

export interface CreateLeadPayload {
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
}

// Mirrors the server rules so the status menu only offers legal moves. The
// API still rejects anything invalid - this is UX, not enforcement.
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['WON', 'LOST'],
  WON: [],
  LOST: ['NEW'],
};

export const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  WON: 'Won',
  LOST: 'Lost',
};

export const STATUS_DESCRIPTION: Record<LeadStatus, string> = {
  NEW: 'Captured, not yet reached out to',
  CONTACTED: 'First conversation has happened',
  QUALIFIED: 'Budget and need confirmed',
  WON: 'Closed and signed',
  LOST: 'Written off or gone quiet',
};

export function nextStatusOptions(current: LeadStatus): readonly LeadStatus[] {
  return LEAD_STATUS_TRANSITIONS[current];
}
