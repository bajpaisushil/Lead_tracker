import { describe, expect, it } from 'vitest';

import { formatPercent, initials, relativeTime } from '@/lib/utils';

describe('initials', () => {
  it('takes the first and last initial', () => {
    expect(initials('Ananya Rao')).toBe('AR');
  });

  it('uses two letters for a single word name', () => {
    expect(initials('Cher')).toBe('CH');
  });

  it('skips the middle name', () => {
    expect(initials('Rahul Kumar Mehta')).toBe('RM');
  });

  it('survives an empty name', () => {
    expect(initials('   ')).toBe('?');
  });
});

describe('relativeTime', () => {
  const now = new Date('2026-09-22T12:00:00.000Z');

  it('calls anything under a minute just now', () => {
    expect(relativeTime('2026-09-22T11:59:30.000Z', now)).toBe('just now');
  });

  it('reports hours', () => {
    expect(relativeTime('2026-09-22T09:00:00.000Z', now)).toBe('3 hours ago');
  });

  it('reports days', () => {
    expect(relativeTime('2026-09-20T12:00:00.000Z', now)).toBe('2 days ago');
  });

  it('returns an empty string for an unparseable date', () => {
    expect(relativeTime('not-a-date', now)).toBe('');
  });
});

describe('formatPercent', () => {
  it('renders a fraction as a whole percentage', () => {
    expect(formatPercent(0.5)).toBe('50%');
  });

  it('shows a placeholder when nothing has closed', () => {
    expect(formatPercent(null)).toBe('--');
  });
});
