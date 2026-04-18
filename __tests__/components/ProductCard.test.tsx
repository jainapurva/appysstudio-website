import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/lib/products';

const mockAddItem = vi.fn();
let mockSession: { data: Record<string, unknown> | null } = { data: null };

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession,
}));

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({ addItem: mockAddItem }),
}));

vi.mock('@/lib/useAnalytics', () => ({
  trackEvent: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img {...rest} data-fill={fill ? 'true' : undefined} />;
  },
}));

const mockProduct: Product = {
  id: 'desk-organizer-pro',
  name: 'Desk Organizer Pro',
  category: 'organizers',
  price: 24.99,
  description: 'A great desk organizer',
  features: ['6 compartments', 'Stackable', 'Non-slip'],
  image: 'https://images.unsplash.com/test.jpg',
  inStock: true,
  leadTime: '2-3 days',
  materials: ['PLA', 'PETG'],
};

describe('ProductCard', () => {
  beforeEach(() => {
    mockSession = { data: null };
    mockAddItem.mockClear();
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ watchlist: [] }) } as Response)
    );
  });

  it('renders product info', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Desk Organizer Pro')).toBeInTheDocument();
    expect(screen.getByText('A great desk organizer')).toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
    expect(screen.getByText('2-3 days')).toBeInTheDocument();
    expect(screen.getByText('PLA / PETG')).toBeInTheDocument();
  });

  it('renders features', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('6 compartments')).toBeInTheDocument();
    expect(screen.getByText('Stackable')).toBeInTheDocument();
    expect(screen.getByText('Non-slip')).toBeInTheDocument();
  });

  it('calls addItem on Add to Cart click', () => {
    render(<ProductCard product={mockProduct} />);

    fireEvent.click(screen.getByText('Add to Cart'));
    expect(mockAddItem).toHaveBeenCalledWith(mockProduct);
  });

  it('does NOT show heart icon when logged out', () => {
    render(<ProductCard product={mockProduct} />);

    // Heart button should not be present
    const buttons = screen.getAllByRole('button');
    const heartButton = buttons.find(b => b.querySelector('.lucide-heart'));
    expect(heartButton).toBeUndefined();
  });

  it('shows heart icon when logged in', async () => {
    mockSession = {
      data: { user: { name: 'Test', email: 'test@test.com' } },
    };

    render(<ProductCard product={mockProduct} />);

    // Heart button should be present (there are 2 buttons: heart + add to cart)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
  });

  it('fetches watchlist state when logged in', async () => {
    mockSession = {
      data: { user: { name: 'Test', email: 'test@test.com' } },
    };

    render(<ProductCard product={mockProduct} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/watchlist');
    });
  });

  it('toggles watchlist on heart click', async () => {
    mockSession = {
      data: { user: { name: 'Test', email: 'test@test.com' } },
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve({ watchlist: [] }) } as Response)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ watchlist: ['desk-organizer-pro'] }) } as Response);

    render(<ProductCard product={mockProduct} />);

    // Wait for initial fetch
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Click the heart button (first button)
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/user/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'desk-organizer-pro' }),
      });
    });
  });
});
