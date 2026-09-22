export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const DEFAULT_LEAD_STATUS: LeadStatus = 'NEW';

// WON is terminal on purpose: reopening a closed deal is a different flow.
export const LEAD_STATUS_TRANSITIONS: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  NEW: ['CONTACTED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['WON', 'LOST'],
  WON: [],
  LOST: ['NEW'],
} as const;

export function allowedTransitionsFrom(status: LeadStatus): readonly LeadStatus[] {
  return LEAD_STATUS_TRANSITIONS[status];
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true;
  return LEAD_STATUS_TRANSITIONS[from].includes(to);
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && (LEAD_STATUSES as readonly string[]).includes(value);
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLeadData {
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
}

export type LeadSortField = 'createdAt' | 'updatedAt' | 'name' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface ListLeadsFilter {
  search?: string;
  status?: LeadStatus[];
  page: number;
  pageSize: number;
  sortBy: LeadSortField;
  sortDirection: SortDirection;
}

export interface PaginatedLeads {
  items: Lead[];
  total: number;
}

export type LeadStatusCounts = Record<LeadStatus, number>;

export function emptyStatusCounts(): LeadStatusCounts {
  return LEAD_STATUSES.reduce<LeadStatusCounts>(
    (counts, status) => ({ ...counts, [status]: 0 }),
    {} as LeadStatusCounts,
  );
}

export interface LeadStats {
  total: number;
  byStatus: LeadStatusCounts;
  conversionRate: number | null;
  createdLast7Days: number;
}
