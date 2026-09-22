import { cn } from '@/lib/utils';
import { STATUS_LABEL, type LeadStatus } from '@/types/lead';

const TONE: Record<LeadStatus, string> = {
  NEW: 'bg-[var(--status-new-soft)] text-[var(--status-new)]',
  CONTACTED: 'bg-[var(--status-contacted-soft)] text-[var(--status-contacted)]',
  QUALIFIED: 'bg-[var(--status-qualified-soft)] text-[var(--status-qualified)]',
  WON: 'bg-[var(--status-won-soft)] text-[var(--status-won)]',
  LOST: 'bg-[var(--status-lost-soft)] text-[var(--status-lost)]',
};

const DOT: Record<LeadStatus, string> = {
  NEW: 'bg-[var(--status-new)]',
  CONTACTED: 'bg-[var(--status-contacted)]',
  QUALIFIED: 'bg-[var(--status-qualified)]',
  WON: 'bg-[var(--status-won)]',
  LOST: 'bg-[var(--status-lost)]',
};

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        TONE[status],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', DOT[status])} aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export { TONE as statusTone, DOT as statusDot };
