'use client';

import { Button } from '@/components/ui/button';
import type { PageMeta } from '@/types/lead';

interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ meta, onPageChange, disabled }: PaginationProps) {
  if (meta.total === 0) return null;

  const firstOnPage = (meta.page - 1) * meta.pageSize + 1;
  const lastOnPage = Math.min(meta.page * meta.pageSize, meta.total);

  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-[13px] text-ink-muted">
        Showing <span className="font-medium text-ink">{firstOnPage}</span>
        {'–'}
        <span className="font-medium text-ink">{lastOnPage}</span> of{' '}
        <span className="font-medium text-ink">{meta.total}</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || !meta.hasPreviousPage}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Previous
        </Button>

        <span className="px-1 text-[13px] tabular-nums text-ink-muted">
          {meta.page} / {meta.totalPages}
        </span>

        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || !meta.hasNextPage}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
