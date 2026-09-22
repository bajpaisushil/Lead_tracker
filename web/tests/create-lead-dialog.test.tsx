import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateLeadDialog } from '@/features/leads/components/create-lead-dialog';
import { ApiError } from '@/lib/api-client';
import type { Lead } from '@/types/lead';
import { renderWithProviders } from './render';

const createLead = vi.hoisted(() => vi.fn());

vi.mock('@/features/leads/api', () => ({
  createLead,
  fetchLeads: vi.fn(),
  fetchLeadStats: vi.fn(),
  updateLeadStatus: vi.fn(),
  buildLeadSearchParams: vi.fn(() => ''),
}));

const created: Lead = {
  id: '1',
  name: 'Ananya Rao',
  email: 'ananya.rao@northwind.co',
  phone: '+91 98200 11223',
  status: 'NEW',
  createdAt: '2026-09-22T09:00:00.000Z',
  updatedAt: '2026-09-22T09:00:00.000Z',
};

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), 'Ananya Rao');
  await user.type(screen.getByLabelText(/email/i), 'ananya.rao@northwind.co');
  await user.type(screen.getByLabelText(/phone/i), '+91 98200 11223');
}

describe('CreateLeadDialog', () => {
  beforeEach(() => {
    createLead.mockReset();
  });

  it('renders nothing while closed', () => {
    renderWithProviders(<CreateLeadDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks submission and shows a message per empty field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateLeadDialog open onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add lead/i }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Phone is required')).toBeInTheDocument();
    expect(createLead).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as the user edits it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateLeadDialog open onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /add lead/i }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/full name/i), 'A');
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('submits a trimmed payload and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    createLead.mockResolvedValue(created);

    renderWithProviders(<CreateLeadDialog open onClose={onClose} />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /add lead/i }));

    await waitFor(() => {
      expect(createLead).toHaveBeenCalledWith({
        name: 'Ananya Rao',
        email: 'ananya.rao@northwind.co',
        phone: '+91 98200 11223',
        status: 'NEW',
      });
    });

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('puts a duplicate email from the server on the email field', async () => {
    const user = userEvent.setup();
    createLead.mockRejectedValue(
      new ApiError(409, 'DUPLICATE_EMAIL', 'A lead with that email already exists'),
    );

    renderWithProviders(<CreateLeadDialog open onClose={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /add lead/i }));

    expect(
      await screen.findByText('A lead with this email already exists'),
    ).toBeInTheDocument();
  });

  it('maps server side validation issues onto their fields', async () => {
    const user = userEvent.setup();
    createLead.mockRejectedValue(
      new ApiError(400, 'VALIDATION_ERROR', 'The request payload is invalid', [
        { field: 'phone', message: 'Phone must contain between 7 and 15 digits' },
      ]),
    );

    renderWithProviders(<CreateLeadDialog open onClose={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: /add lead/i }));

    expect(
      await screen.findByText('Phone must contain between 7 and 15 digits'),
    ).toBeInTheDocument();
  });

  it('closes on escape without submitting', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(<CreateLeadDialog open onClose={onClose} />);

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
    expect(createLead).not.toHaveBeenCalled();
  });
});
