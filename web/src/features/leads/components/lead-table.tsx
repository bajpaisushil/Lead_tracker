'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, initials, relativeTime } from '@/lib/utils';
import type { Lead, LeadStatus } from '@/types/lead';
import { StatusSelect } from './status-select';

interface LeadTableProps {
  leads: Lead[];
  onStatusChange: (lead: Lead, status: LeadStatus) => void;
  pendingLeadId?: string | null;
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-semibold text-accent"
    >
      {initials(name)}
    </span>
  );
}

export function LeadTable({ leads, onStatusChange, pendingLeadId }: LeadTableProps) {
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Leads in the pipeline</caption>
          <thead>
            <tr className="border-b border-line text-left">
              <th scope="col" className="px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                Lead
              </th>
              <th scope="col" className="px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                Phone
              </th>
              <th scope="col" className="px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                Status
              </th>
              <th scope="col" className="px-5 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                Added
              </th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-line transition-colors last:border-0 hover:bg-surface-hover"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={lead.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{lead.name}</p>
                      <a
                        href={`mailto:${lead.email}`}
                        className="truncate text-[13px] text-ink-muted transition-colors hover:text-accent"
                      >
                        {lead.email}
                      </a>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-3">
                  <a
                    href={`tel:${lead.phone.replace(/\s+/g, '')}`}
                    className="tabular-nums text-ink-muted transition-colors hover:text-accent"
                  >
                    {lead.phone}
                  </a>
                </td>

                <td className="px-5 py-3">
                  <StatusSelect
                    status={lead.status}
                    leadName={lead.name}
                    disabled={pendingLeadId === lead.id}
                    onChange={(status) => onStatusChange(lead, status)}
                  />
                </td>

                <td className="px-5 py-3 text-right">
                  <time dateTime={lead.createdAt} title={formatDateTime(lead.createdAt)} className="text-[13px] text-ink-muted">
                    {relativeTime(lead.createdAt)}
                  </time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-[var(--border)] md:hidden">
        {leads.map((lead) => (
          <li key={lead.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar name={lead.name} />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{lead.name}</p>
                <a href={`mailto:${lead.email}`} className="block truncate text-[13px] text-ink-muted">
                  {lead.email}
                </a>
                <a href={`tel:${lead.phone.replace(/\s+/g, '')}`} className="mt-0.5 block text-[13px] tabular-nums text-ink-muted">
                  {lead.phone}
                </a>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <StatusSelect
                    status={lead.status}
                    leadName={lead.name}
                    disabled={pendingLeadId === lead.id}
                    onChange={(status) => onStatusChange(lead, status)}
                  />
                  <time dateTime={lead.createdAt} className="shrink-0 text-xs text-ink-subtle">
                    {relativeTime(lead.createdAt)}
                  </time>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function LeadTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--border)]">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40 max-w-[45%]" />
            <Skeleton className="h-3 w-56 max-w-[65%]" />
          </div>
          <Skeleton className="hidden h-3 w-28 sm:block" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="hidden h-3 w-16 md:block" />
        </div>
      ))}
    </div>
  );
}
