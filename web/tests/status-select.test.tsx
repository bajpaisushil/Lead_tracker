import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StatusSelect } from '@/features/leads/components/status-select';
import { renderWithProviders } from './render';

describe('StatusSelect', () => {
  it('offers only the transitions the server would accept', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StatusSelect status="NEW" leadName="Ananya Rao" onChange={vi.fn()} />,
    );

    await user.click(screen.getByRole('button', { name: /change status/i }));

    const menu = screen.getByRole('menu');
    expect(menu).toHaveTextContent('Contacted');
    expect(menu).toHaveTextContent('Lost');
    expect(menu).not.toHaveTextContent('Won');
    expect(menu).not.toHaveTextContent('Qualified');
  });

  it('reports the chosen status', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <StatusSelect status="QUALIFIED" leadName="Priya Nair" onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: /change status/i }));
    await user.click(screen.getByRole('menuitem', { name: /won/i }));

    expect(onChange).toHaveBeenCalledWith('WON');
  });

  it('renders a won lead as a plain badge with no menu', () => {
    renderWithProviders(<StatusSelect status="WON" leadName="Rahul Mehta" onChange={vi.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Won')).toBeInTheDocument();
  });

  it('closes on escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<StatusSelect status="NEW" leadName="Ananya Rao" onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /change status/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not open while an update is in flight', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <StatusSelect status="NEW" leadName="Ananya Rao" onChange={vi.fn()} disabled />,
    );

    await user.click(screen.getByRole('button', { name: /change status/i }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
