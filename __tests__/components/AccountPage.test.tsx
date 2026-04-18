import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountPage from '@/app/account/page';

const mockSignOut = vi.fn();
const mockSession = {
  data: {
    user: { name: 'John Doe', email: 'john@test.com', image: null },
  },
};

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession,
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img {...rest} data-fill={fill ? 'true' : undefined} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('AccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // never resolves

    render(<AccountPage />);
    // Should show the spinner (Loader2 renders as svg)
    const container = document.querySelector('.animate-spin');
    expect(container).not.toBeNull();
  });

  it('renders profile tab with user info after loading', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        user: {
          id: 'user_1',
          email: 'john@test.com',
          name: 'John Doe',
          phone: '555-1234',
          address: '123 Main St',
          watchlist: [],
        },
        orders: [],
      }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });

    // Check form is pre-filled
    const nameInput = screen.getByDisplayValue('John Doe') as HTMLInputElement;
    expect(nameInput).toBeInTheDocument();
    expect(screen.getByDisplayValue('555-1234')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument();
  });

  it('shows tab buttons for Profile, Orders, and Watchlist', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ user: null, orders: [] }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Watchlist')).toBeInTheDocument();
  });

  it('switches to Orders tab showing empty state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ user: null, orders: [] }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Orders')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Orders'));

    expect(screen.getByText('No orders yet')).toBeInTheDocument();
    expect(screen.getByText('Browse Products')).toBeInTheDocument();
  });

  it('shows order history in Orders tab', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        user: null,
        orders: [
          {
            id: 'ord_abc',
            type: 'product',
            customerName: 'John',
            customerEmail: 'john@test.com',
            status: 'confirmed',
            createdAt: '2024-06-15T00:00:00.000Z',
            items: [{ productName: 'Desk Organizer', quantity: 2, price: 24.99, productId: 'desk' }],
            totalAmount: 49.98,
          },
        ],
      }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Orders')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Orders'));

    expect(screen.getByText('Order #ord_abc')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Desk Organizer x2')).toBeInTheDocument();
    // $49.98 appears twice (line item + total), use getAllByText
    expect(screen.getAllByText('$49.98')).toHaveLength(2);
  });

  it('switches to Watchlist tab showing empty state', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ user: { watchlist: [] }, orders: [] }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Watchlist')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Watchlist'));

    expect(screen.getByText('Your watchlist is empty')).toBeInTheDocument();
  });

  it('shows watchlist items with product details', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        user: { watchlist: ['desk-organizer-pro'] },
        orders: [],
      }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Watchlist')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Watchlist'));

    expect(screen.getByText('Desk Organizer Pro')).toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  it('calls signOut when Sign Out button is clicked', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ user: null, orders: [] }),
    });

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sign Out'));
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('saves profile on Save Changes click', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          user: { name: 'John Doe', phone: '', address: '', watchlist: [] },
          orders: [],
        }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          user: { name: 'John Doe', phone: '555-9999', address: '', watchlist: [] },
        }),
      });

    global.fetch = mockFetch;

    render(<AccountPage />);

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/user', expect.objectContaining({
        method: 'PATCH',
      }));
    });
  });
});
