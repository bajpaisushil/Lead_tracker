import { describe, expect, it } from 'vitest';

import { validateLeadForm } from '@/features/leads/validation';

const valid = {
  name: 'Ananya Rao',
  email: 'ananya.rao@northwind.co',
  phone: '+91 98200 11223',
};

describe('validateLeadForm', () => {
  it('passes a well formed lead', () => {
    expect(validateLeadForm(valid)).toEqual({});
  });

  it('requires every field', () => {
    const errors = validateLeadForm({ name: '', email: '', phone: '' });

    expect(errors.name).toBe('Name is required');
    expect(errors.email).toBe('Email is required');
    expect(errors.phone).toBe('Phone is required');
  });

  it('rejects a one character name', () => {
    expect(validateLeadForm({ ...valid, name: 'A' }).name).toMatch(/at least 2/);
  });

  it('ignores surrounding whitespace when measuring the name', () => {
    expect(validateLeadForm({ ...valid, name: '   ' }).name).toBe('Name is required');
  });

  it.each(['nope', 'nope@', 'nope@domain', 'a b@c.com'])('rejects the email %s', (email) => {
    expect(validateLeadForm({ ...valid, email }).email).toBe('Enter a valid email address');
  });

  it.each(['+1 (415) 555-0142', '9845012345', '020-7946-0958'])(
    'accepts the phone %s',
    (phone) => {
      expect(validateLeadForm({ ...valid, phone }).phone).toBeUndefined();
    },
  );

  it('rejects letters in a phone number', () => {
    expect(validateLeadForm({ ...valid, phone: 'call me' }).phone).toMatch(/digits, spaces/);
  });

  it('rejects a phone with too few digits', () => {
    expect(validateLeadForm({ ...valid, phone: '12345' }).phone).toMatch(/7 and 15 digits/);
  });

  it('matches the server rules so the same input is not accepted here and rejected there', () => {
    // 16 digits passes the character check but exceeds the digit count.
    expect(validateLeadForm({ ...valid, phone: '+1234567890123456' }).phone).toBeDefined();
  });
});
