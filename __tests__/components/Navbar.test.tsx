import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '@/components/Navbar';

// Mock next-auth/react
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
let mockSession: { data: Record<string, unknown> | null } = { data: null };

vi.mock('next-auth/react', () => ({
  useSession: () => mockSession,
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock cart context
vi.mock('@/context/CartContext', () => ({
  useCart: () => ({ itemCount: 2 }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img {...rest} data-fill={fill ? 'true' : undefined} />;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('Navbar', () => {
  beforeEach(() => {
    mockSession = { data: null };
    vi.clearAllMocks();
  });

  it('renders logo and nav links', () => {
    render(<Navbar />);

    expect(screen.getByAltText("Appy's Studio")).toBeInTheDocument();
    expect(screen.getByText('Shop')).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Custom Print')).toBeInTheDocument();
    expect(screen.getByText('Support')).toBeInTheDocument();
  });

  it('shows cart count badge', () => {
    render(<Navbar />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows Sign In button when not authenticated', () => {
    render(<Navbar />);

    const signInButtons = screen.getAllByText('Sign In');
    expect(signInButtons.length).toBeGreaterThan(0);
  });

  it('calls signIn when Sign In button is clicked', () => {
    render(<Navbar />);

    // Click the desktop sign-in button
    const signInButtons = screen.getAllByText('Sign In');
    fireEvent.click(signInButtons[0]);

    expect(mockSignIn).toHaveBeenCalled();
  });

  it('shows user avatar and dropdown when authenticated', () => {
    mockSession = {
      data: {
        user: { name: 'John Doe', email: 'john@test.com', image: 'https://example.com/avatar.jpg' },
      },
    };

    render(<Navbar />);

    // Should show avatar image
    expect(screen.getByAltText('')).toBeInTheDocument();
    // Should NOT show Sign In
    expect(screen.queryByText('Sign In')).toBeNull();
  });

  it('shows initial when user has no image', () => {
    mockSession = {
      data: {
        user: { name: 'Jane Doe', email: 'jane@test.com' },
      },
    };

    render(<Navbar />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('opens dropdown with My Account and Sign Out on avatar click', () => {
    mockSession = {
      data: {
        user: { name: 'John Doe', email: 'john@test.com' },
      },
    };

    render(<Navbar />);

    // Click the user initial button
    fireEvent.click(screen.getByText('J'));

    expect(screen.getByText('My Account')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@test.com')).toBeInTheDocument();
  });

  it('calls signOut when Sign Out is clicked in dropdown', () => {
    mockSession = {
      data: {
        user: { name: 'John Doe', email: 'john@test.com' },
      },
    };

    render(<Navbar />);
    fireEvent.click(screen.getByText('J'));
    fireEvent.click(screen.getByText('Sign Out'));

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('links to /account from dropdown', () => {
    mockSession = {
      data: {
        user: { name: 'John Doe', email: 'john@test.com' },
      },
    };

    render(<Navbar />);
    fireEvent.click(screen.getByText('J'));

    const accountLink = screen.getByText('My Account').closest('a');
    expect(accountLink).toHaveAttribute('href', '/account');
  });
});
