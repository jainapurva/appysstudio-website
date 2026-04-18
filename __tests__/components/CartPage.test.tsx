import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CartPage from '@/app/cart/page';
import type { Product } from '@/lib/products';

const mockProduct: Product = {
  id: 'desk-organizer-pro',
  name: 'Desk Organizer Pro',
  category: 'organizers',
  price: 24.99,
  description: 'A great desk organizer',
  features: ['6 compartments'],
  image: 'https://images.unsplash.com/test.jpg',
  inStock: true,
  leadTime: '2-3 days',
  materials: ['PLA'],
};

let mockCartItems: Array<{ product: Product; quantity: number }> = [];
let mockSession: { data: Record<string, unknown> | null } = { data: null };

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({
    items: mockCartItems,
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    total: mockCartItems.reduce((s, i) => s + i.product.price * i.quantity, 0),
    clearCart: vi.fn(),
  }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession,
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

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('CartPage', () => {
  beforeEach(() => {
    mockCartItems = [];
    mockSession = { data: null };
  });

  it('shows empty state when cart has no items', () => {
    render(<CartPage />);
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText('Browse Products')).toBeInTheDocument();
  });

  it('renders cart items', () => {
    mockCartItems = [{ product: mockProduct, quantity: 2 }];

    render(<CartPage />);

    expect(screen.getByText('Desk Organizer Pro')).toBeInTheDocument();
    // $49.98 appears in both the item row and the order summary total
    expect(screen.getAllByText('$49.98').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$24.99 each')).toBeInTheDocument();
  });

  it('shows empty name/email fields when not logged in', () => {
    mockCartItems = [{ product: mockProduct, quantity: 1 }];

    render(<CartPage />);

    const nameInput = screen.getByPlaceholderText('Full Name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Email address') as HTMLInputElement;

    expect(nameInput.value).toBe('');
    expect(emailInput.value).toBe('');
  });

  it('pre-fills name and email from session', async () => {
    mockCartItems = [{ product: mockProduct, quantity: 1 }];
    mockSession = {
      data: {
        user: { name: 'Jane Doe', email: 'jane@test.com' },
      },
    };

    render(<CartPage />);

    // The useEffect should pre-fill
    const nameInput = screen.getByPlaceholderText('Full Name') as HTMLInputElement;
    const emailInput = screen.getByPlaceholderText('Email address') as HTMLInputElement;

    // Wait for the effect to fire
    await vi.waitFor(() => {
      expect(nameInput.value).toBe('Jane Doe');
      expect(emailInput.value).toBe('jane@test.com');
    });
  });
});
