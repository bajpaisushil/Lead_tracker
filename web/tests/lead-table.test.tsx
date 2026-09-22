import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LeadTable } from '@/features/leads/components/lead-table';
import type { Lead } from '@/types/lead';
import { renderWithProviders } from './render';

const leads: Lead[] = [
  {
    id: '1',
    name: 'Ananya Rao',
    email: 'ananya.rao@northwind.co',
    phone: '+91 98200 11223',
    status: 'NEW',
    createdAt: '2026-09-22T09:00:00.000Z',
    updatedAt: '2026-09-22T09:00:00.000Z',
  },
  {
    id: '2',
    name: 'Rahul Mehta',
    email: 'rahul@brightline.in',
    phone: '+91 99001 22334',
    status: 'WON',
    createdAt: '2026-09-20T09:00:00.000Z',
    updatedAt: '2026-09-21T09:00:00.000Z',
  },
];

describe('LeadTable', () => {
  it('renders a row per lead with contact details', () => {
    renderWithProviders(<LeadTable leads={leads} onStatusChange={vi.fn()} />);

    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(leads.length + 1);
    expect(within(table).getByText('ananya.rao@northwind.co')).toBeInTheDocument();
  });

  it('makes email and phone actionable', () => {
    renderWithProviders(<LeadTable leads={leads} onStatusChange={vi.fn()} />);

    const table = screen.getByRole('table');
    expect(within(table).getByRole('link', { name: 'ananya.rao@northwind.co' })).toHaveAttribute(
      'href',
      'mailto:ananya.rao@northwind.co',
    );
    expect(within(table).getByRole('link', { name: '+91 98200 11223' })).toHaveAttribute(
      'href',
      'tel:+919820011223',
    );
  });

  it('shows a relative created time with the exact date on hover', () => {
    renderWithProviders(<LeadTable leads={leads} onStatusChange={vi.fn()} />);

    const table = screen.getByRole('table');
    const stamp = within(table).getAllByText(/ago|just now/i)[0];
    expect(stamp).toHaveAttribute('title');
  });

  it('renders the same leads as cards for small screens', () => {
    renderWithProviders(<LeadTable leads={leads} onStatusChange={vi.fn()} />);

    // One table row and one card per lead.
    expect(screen.getAllByText('Ananya Rao')).toHaveLength(2);
  });
});
