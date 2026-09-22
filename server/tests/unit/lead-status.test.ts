import { describe, expect, it } from 'vitest';

import {
  LEAD_STATUSES,
  LEAD_STATUS_TRANSITIONS,
  allowedTransitionsFrom,
  canTransition,
  isLeadStatus,
} from '../../src/modules/leads/lead.types';

describe('lead status transitions', () => {
  it('walks the happy path one step at a time', () => {
    expect(canTransition('NEW', 'CONTACTED')).toBe(true);
    expect(canTransition('CONTACTED', 'QUALIFIED')).toBe(true);
    expect(canTransition('QUALIFIED', 'WON')).toBe(true);
  });

  it('refuses to skip stages', () => {
    expect(canTransition('NEW', 'QUALIFIED')).toBe(false);
    expect(canTransition('NEW', 'WON')).toBe(false);
    expect(canTransition('CONTACTED', 'WON')).toBe(false);
  });

  it('lets a lead be marked lost from any open stage', () => {
    expect(canTransition('NEW', 'LOST')).toBe(true);
    expect(canTransition('CONTACTED', 'LOST')).toBe(true);
    expect(canTransition('QUALIFIED', 'LOST')).toBe(true);
  });

  it('treats WON as terminal', () => {
    expect(allowedTransitionsFrom('WON')).toHaveLength(0);
    expect(canTransition('WON', 'LOST')).toBe(false);
    expect(canTransition('WON', 'NEW')).toBe(false);
  });

  it('allows a lost lead to be reopened as NEW only', () => {
    expect(canTransition('LOST', 'NEW')).toBe(true);
    expect(canTransition('LOST', 'QUALIFIED')).toBe(false);
  });

  it('treats re-applying the current status as a no-op, not an error', () => {
    for (const status of LEAD_STATUSES) {
      expect(canTransition(status, status)).toBe(true);
    }
  });

  it('defines a transition list for every status', () => {
    for (const status of LEAD_STATUSES) {
      expect(LEAD_STATUS_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('narrows unknown values', () => {
    expect(isLeadStatus('NEW')).toBe(true);
    expect(isLeadStatus('PENDING')).toBe(false);
    expect(isLeadStatus(null)).toBe(false);
  });
});
