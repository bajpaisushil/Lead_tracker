import type { CreateLeadPayload } from '@/types/lead';

export type LeadFormValues = Omit<CreateLeadPayload, 'status'>;
export type LeadFormErrors = Partial<Record<keyof LeadFormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[\d\s\-().]+$/;

// Same rules the API enforces, applied here so the user sees the problem
// before a round trip. The server stays the authority.
export function validateLeadForm(values: LeadFormValues): LeadFormErrors {
  const errors: LeadFormErrors = {};

  const name = values.name.trim();
  if (name.length === 0) errors.name = 'Name is required';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  else if (name.length > 120) errors.name = 'Name must be 120 characters or fewer';

  const email = values.email.trim();
  if (email.length === 0) errors.email = 'Email is required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address';

  const phone = values.phone.trim();
  const digits = phone.replace(/\D/g, '').length;
  if (phone.length === 0) errors.phone = 'Phone is required';
  else if (!PHONE_PATTERN.test(phone)) errors.phone = 'Phone can only contain digits, spaces and + - ( )';
  else if (digits < 7 || digits > 15) errors.phone = 'Phone must contain between 7 and 15 digits';

  return errors;
}

export const EMPTY_LEAD_FORM: LeadFormValues = { name: '', email: '', phone: '' };
