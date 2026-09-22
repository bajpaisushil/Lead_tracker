import { z } from 'zod';

import { LEAD_STATUSES } from './lead.types';

const nameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(120, 'Name must be 120 characters or fewer');

const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email address')
  .max(254, 'Email must be 254 characters or fewer');

const phoneSchema = z
  .string({ required_error: 'Phone is required' })
  .trim()
  .min(7, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .regex(/^\+?[\d\s\-().]+$/, 'Phone can only contain digits, spaces and + - ( )')
  .refine((value) => {
    const digits = value.replace(/\D/g, '').length;
    return digits >= 7 && digits <= 15;
  }, 'Phone must contain between 7 and 15 digits');

export const createLeadSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  status: z.enum(LEAD_STATUSES).default('NEW'),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadStatusSchema = z.object({
  status: z.enum(LEAD_STATUSES, {
    errorMap: () => ({ message: `Status must be one of: ${LEAD_STATUSES.join(', ')}` }),
  }),
});

export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

// Accepts ?status=NEW&status=WON as well as ?status=NEW,WON
const statusFilterSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parts = Array.isArray(value) ? value : String(value).split(',');
  const cleaned = parts.map((part) => String(part).trim().toUpperCase()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}, z.array(z.enum(LEAD_STATUSES)).optional());

export const listLeadsQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(120, 'Search term is too long')
    .optional()
    .transform((value) => (value ? value : undefined)),
  status: statusFilterSchema,
  page: z.coerce.number().int().min(1, 'Page starts at 1').default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'pageSize starts at 1')
    .max(100, 'pageSize cannot exceed 100')
    .default(10),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'status']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

export const leadIdParamSchema = z.object({
  id: z.string().trim().min(1, 'Lead id is required'),
});
