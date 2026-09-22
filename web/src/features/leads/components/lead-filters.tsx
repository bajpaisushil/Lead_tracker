'use client';

import { cn } from '@/lib/utils';
import {
  LEAD_STATUSES,
  STATUS_LABEL,
  type LeadSortField,
  type LeadStatus,
  type SortDirection,
} from '@/types/lead';
import { statusDot } from '@/components/ui/status-badge';

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedStatuses: LeadStatus[];
  onStatusToggle: (status: LeadStatus) => void;
  onClearStatuses: () => void;
  sortBy: LeadSortField;
  sortDirection: SortDirection;
  onSortChange: (sortBy: LeadSortField, direction: SortDirection) => void;
  counts?: Record<LeadStatus, number>;
}

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name A–Z' },
  { value: 'name:desc', label: 'Name Z–A' },
  { value: 'updatedAt:desc', label: 'Recently updated' },
];

export function LeadFilters({
  search,
  onSearchChange,
  selectedStatuses,
  onStatusToggle,
  onClearStatuses,
  sortBy,
  sortDirection,
  onSortChange,
  counts,
}: LeadFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          <input
            type="search"
            role="searchbox"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search leads"
            className="h-10 w-full rounded-lg bg-surface pl-9 pr-9 text-sm text-ink ring-1 ring-line transition-colors placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent"
          />

          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="size-3.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        <label className="sr-only" htmlFor="lead-sort">
          Sort leads
        </label>
        <select
          id="lead-sort"
          value={`${sortBy}:${sortDirection}`}
          onChange={(event) => {
            const [field, direction] = event.target.value.split(':');
            onSortChange(field as LeadSortField, direction as SortDirection);
          }}
          className="h-10 shrink-0 rounded-lg bg-surface px-3 text-sm text-ink ring-1 ring-line transition-colors focus:outline-none focus:ring-2 focus:ring-accent sm:w-48"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onClearStatuses}
          aria-pressed={selectedStatuses.length === 0}
          className={cn(
            'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
            selectedStatuses.length === 0
              ? 'bg-ink text-canvas'
              : 'bg-surface text-ink-muted ring-1 ring-line hover:bg-surface-hover',
          )}
        >
          All
        </button>

        {LEAD_STATUSES.map((status) => {
          const active = selectedStatuses.includes(status);

          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusToggle(status)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                active
                  ? 'bg-ink text-canvas'
                  : 'bg-surface text-ink-muted ring-1 ring-line hover:bg-surface-hover',
              )}
            >
              <span className={cn('size-1.5 rounded-full', statusDot[status])} aria-hidden="true" />
              {STATUS_LABEL[status]}
              {counts ? (
                <span className={cn('tabular-nums', active ? 'opacity-70' : 'text-ink-subtle')}>
                  {counts[status]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
