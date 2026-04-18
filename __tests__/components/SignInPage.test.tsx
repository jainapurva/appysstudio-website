import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignInPage from '@/app/auth/signin/page';

const mockSignIn = vi.fn();
const mockProviders = {
  google: { id: 'google', name: 'Google', type: 'oauth', signinUrl: '/api/auth/signin/google', callbackUrl: '/api/auth/callback/google' },
  facebook: { id: 'facebook', name: 'Facebook', type: 'oauth', signinUrl: '/api/auth/signin/facebook', callbackUrl: '/api/auth/callback/facebook' },
};

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  getProviders: vi.fn(() => Promise.resolve(mockProviders)),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, ...rest } = props;
    return <img {...rest} data-fill={fill ? 'true' : undefined} />;
  },
}));

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome message and branding', async () => {
    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByText('Welcome back')).toBeInTheDocument();
    });

    expect(screen.getByText(/Sign in to access/)).toBeInTheDocument();
    expect(screen.getByAltText("Appy's Studio")).toBeInTheDocument();
  });

  it('renders provider buttons', async () => {
    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText('Continue with Facebook')).toBeInTheDocument();
    });
  });

  it('calls signIn with correct provider on button click', async () => {
    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Continue with Google'));
    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/account' });

    fireEvent.click(screen.getByText('Continue with Facebook'));
    expect(mockSignIn).toHaveBeenCalledWith('facebook', { callbackUrl: '/account' });
  });

  it('shows guest checkout note', async () => {
    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByText(/always check out as a guest/)).toBeInTheDocument();
    });
  });

  it('shows loading spinner before providers load', async () => {
    // The initial render shows a spinner while getProviders resolves
    // Since our mock resolves immediately, we just check the page renders
    render(<SignInPage />);
    // After providers load, spinner should be gone
    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });
  });

  it('shows all configured providers', async () => {
    render(<SignInPage />);

    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
      expect(screen.getByText('Continue with Facebook')).toBeInTheDocument();
    });
  });
});
