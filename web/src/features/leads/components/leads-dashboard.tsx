'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiError } from '@/lib/api-client';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';
import type { Lead, LeadQuery, LeadSortField, LeadStatus, SortDirection } from '@/types/lead';
import { useLeadStats, useLeads, useUpdateLeadStatus } from '../hooks/use-leads';
import { CreateLeadDialog } from './create-lead-dialog';
import { LeadFilters } from './lead-filters';
import { LeadTable, LeadTableSkeleton } from './lead-table';
import { Pagination } from './pagination';
import { StatsCards } from './stats-cards';

const PAGE_SIZE = 10;

export function LeadsDashboard() {
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<LeadSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dialogOpen, setDialogOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const query = useMemo<LeadQuery>(
    () => ({
      search: debouncedSearch,
      status: statuses,
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortDirection,
    }),
    [debouncedSearch, statuses, page, sortBy, sortDirection],
  );

  const leadsQuery = useLeads(query);
  const statsQuery = useLeadStats();
  const statusMutation = useUpdateLeadStatus(query);

  const leads = leadsQuery.data?.leads ?? [];
  const meta = leadsQuery.data?.meta;
  const hasFilters = debouncedSearch.trim().length > 0 || statuses.length > 0;

  function onSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function onStatusToggle(status: LeadStatus) {
    setStatuses((current) =>
      current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
    );
    setPage(1);
  }

  function onClearStatuses() {
    setStatuses([]);
    setPage(1);
  }

  function onSortChange(field: LeadSortField, direction: SortDirection) {
    setSortBy(field);
    setSortDirection(direction);
    setPage(1);
  }

  function onStatusChange(lead: Lead, status: LeadStatus) {
    statusMutation.mutate({ id: lead.id, status });
  }

  return (
    <div className="space-y-6">
      <StatsCards stats={statsQuery.data} loading={statsQuery.isLoading} />

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">Leads</h2>
            <p className="text-[13px] text-ink-muted">
              {meta ? `${meta.total} ${meta.total === 1 ? 'lead' : 'leads'}` : 'Loading leads'}
              {hasFilters ? ' matching your filters' : ''}
            </p>
          </div>

          <Button onClick={() => setDialogOpen(true)}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
              className="size-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add lead
          </Button>
        </div>

        <LeadFilters
          search={search}
          onSearchChange={onSearchChange}
          selectedStatuses={statuses}
          onStatusToggle={onStatusToggle}
          onClearStatuses={onClearStatuses}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={onSortChange}
          counts={statsQuery.data?.byStatus}
        />

        <div
          className={cn(
            'overflow-hidden rounded-xl bg-surface shadow-card ring-1 ring-line transition-opacity',
            leadsQuery.isFetching && !leadsQuery.isLoading && 'opacity-70',
          )}
        >
          {leadsQuery.isLoading ? (
            <LeadTableSkeleton />
          ) : leadsQuery.isError ? (
            <EmptyState
              icon="warning"
              title="Could not load leads"
              description={
                leadsQuery.error instanceof ApiError
                  ? leadsQuery.error.message
                  : 'The server did not respond. Check that the API is running.'
              }
              action={
                <Button variant="secondary" onClick={() => void leadsQuery.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : leads.length === 0 ? (
            hasFilters ? (
              <EmptyState
                icon="search"
                title="No leads match those filters"
                description="Try a different search term, or clear the status filters to see everything."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      onClearStatuses();
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No leads yet"
                description="Add your first lead and it will show up here, ready to move through the pipeline."
                action={<Button onClick={() => setDialogOpen(true)}>Add your first lead</Button>}
              />
            )
          ) : (
            <>
              <LeadTable
                leads={leads}
                onStatusChange={onStatusChange}
                pendingLeadId={statusMutation.isPending ? statusMutation.variables?.id : null}
              />
              {meta ? (
                <Pagination meta={meta} onPageChange={setPage} disabled={leadsQuery.isFetching} />
              ) : null}
            </>
          )}
        </div>
      </section>

      <CreateLeadDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
