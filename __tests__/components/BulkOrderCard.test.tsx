import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkOrderCard from '@/components/BulkOrderCard';

const props = {
  modelName: 'Logo Clicker',
  unitPrice: 5,
  minQuantity: 25,
  includes: ['A clicky switch fitted'],
};

function quantityBox() {
  return screen.getByRole('spinbutton');
}

describe('BulkOrderCard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('opens at the minimum with the total already worked out', () => {
    render(<BulkOrderCard {...props} />);
    expect(quantityBox()).toHaveValue(25);
    expect(screen.getByRole('button', { name: /Request 25 — \$125\.00/ })).toBeInTheDocument();
  });

  it('follows the quantity as it changes', async () => {
    const user = userEvent.setup();
    render(<BulkOrderCard {...props} />);
    await user.clear(quantityBox());
    await user.type(quantityBox(), '40');
    expect(screen.getByRole('button', { name: /Request 40 — \$200\.00/ })).toBeInTheDocument();
  });

  it('pulls a below-minimum quantity back up once the field is left', async () => {
    // Clamping on every keystroke makes the field impossible to edit — you
    // cannot clear it to type a new number — so the floor lands on blur.
    const user = userEvent.setup();
    render(<BulkOrderCard {...props} />);
    await user.clear(quantityBox());
    await user.type(quantityBox(), '3');
    await user.tab();
    expect(quantityBox()).toHaveValue(25);
  });

  it('sends the model, the quantity and the total in one request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    render(<BulkOrderCard {...props} />);
    await user.type(screen.getByLabelText(/Your name/), 'Dana');
    await user.type(screen.getByLabelText(/^Email/), 'dana@example.org');
    await user.type(screen.getByLabelText(/Colours/), 'black cap, orange logo');
    await user.click(screen.getByRole('button', { name: /Request 25/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/quote');

    const body = init.body as FormData;
    expect(body.get('quantity')).toBe('25');
    expect(body.get('email')).toBe('dana@example.org');
    expect(body.get('color')).toBe('black cap, orange logo');
    expect(String(body.get('notes'))).toContain('Logo Clicker — bulk order');
    expect(String(body.get('notes'))).toContain('25 × $5.00 = $125.00');
  });

  it('says so rather than silently swallowing a failed send', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

    const user = userEvent.setup();
    render(<BulkOrderCard {...props} />);
    await user.type(screen.getByLabelText(/Your name/), 'Dana');
    await user.type(screen.getByLabelText(/^Email/), 'dana@example.org');
    await user.click(screen.getByRole('button', { name: /Request 25/ }));

    expect(await screen.findByText(/did not go through/)).toBeInTheDocument();
    // Still on the form, so the details typed are not lost.
    expect(quantityBox()).toBeInTheDocument();
  });
});
