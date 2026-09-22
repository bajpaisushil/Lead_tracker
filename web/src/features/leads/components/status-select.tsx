'use client';

import { useEffect, useRef, useState } from 'react';

import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';
import { STATUS_DESCRIPTION, STATUS_LABEL, type LeadStatus, nextStatusOptions } from '@/types/lead';

interface StatusSelectProps {
  status: LeadStatus;
  onChange: (status: LeadStatus) => void;
  disabled?: boolean;
  leadName: string;
}

export function StatusSelect({ status, onChange, disabled, leadName }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = nextStatusOptions(status);
  const isTerminal = options.length === 0;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (isTerminal) {
    return (
      <span title="A won lead is closed and cannot be moved again">
        <StatusBadge status={status} />
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Change status for ${leadName}, currently ${STATUS_LABEL[status]}`}
        className={cn(
          'group inline-flex items-center gap-1 rounded-full transition-opacity',
          disabled ? 'cursor-wait opacity-60' : 'cursor-pointer hover:opacity-85',
        )}
      >
        <StatusBadge status={status} />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={cn(
            'size-3 text-ink-subtle transition-transform',
            open && 'rotate-180',
          )}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-1.5 w-60 overflow-hidden rounded-xl bg-surface p-1 shadow-pop ring-1 ring-line"
        >
          <p className="px-2.5 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
            Move to
          </p>

          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onChange(option);
              }}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
            >
              <StatusBadge status={option} className="mt-px shrink-0" />
              <span className="text-[12px] leading-snug text-ink-muted">
                {STATUS_DESCRIPTION[option]}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
