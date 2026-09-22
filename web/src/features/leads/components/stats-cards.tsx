'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/utils';
import { LEAD_STATUSES, STATUS_LABEL, type LeadStats } from '@/types/lead';
import { statusDot } from '@/components/ui/status-badge';

interface StatsCardsProps {
  stats?: LeadStats;
  loading: boolean;
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-line">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-7 w-10" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <div className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-line">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-subtle">Total</p>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">
          {stats.total}
        </p>
        <p className="mt-1 text-[11px] text-ink-subtle">
          {stats.createdLast7Days} added this week
        </p>
      </div>

      {LEAD_STATUSES.map((status) => (
        <div key={status} className="rounded-xl bg-surface p-4 shadow-card ring-1 ring-line">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
            <span className={cn('size-1.5 rounded-full', statusDot[status])} aria-hidden="true" />
            {STATUS_LABEL[status]}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {stats.byStatus[status]}
          </p>
          {status === 'WON' ? (
            <p className="mt-1 text-[11px] text-ink-subtle">
              {formatPercent(stats.conversionRate)} of closed
            </p>
          ) : (
            <p className="mt-1 text-[11px] text-transparent select-none" aria-hidden="true">
              .
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
