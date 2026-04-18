'use client';
import { signIn, getProviders } from 'next-auth/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { ClientSafeProvider } from 'next-auth/react';

const providerIcons: Record<string, { bg: string; label: string }> = {
  google: { bg: 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200', label: 'Continue with Google' },
  facebook: { bg: 'bg-[#1877F2] text-white hover:bg-[#166FE5]', label: 'Continue with Facebook' },
  apple: { bg: 'bg-black text-white hover:bg-gray-900', label: 'Continue with Apple' },
};

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null);

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Appy's Studio" width={64} height={64} className="rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to access your account, order history, and watchlist.</p>
        </div>

        <div className="space-y-3">
          {providers && Object.values(providers).map(provider => {
            const style = providerIcons[provider.id] || { bg: 'bg-purple-500 text-white hover:bg-purple-600', label: `Continue with ${provider.name}` };
            return (
              <button
                key={provider.id}
                onClick={() => signIn(provider.id, { callbackUrl: '/account' })}
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${style.bg}`}
              >
                {provider.id === 'google' && (
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                )}
                {provider.id === 'facebook' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                )}
                {provider.id === 'apple' && (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                )}
                {style.label}
              </button>
            );
          })}

          {!providers && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {providers && Object.keys(providers).length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              <p>No sign-in providers configured yet.</p>
              <p className="mt-1">Set up Google, Facebook, or Apple credentials in your environment variables.</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          You can always check out as a guest. Signing in saves your info and order history.
        </p>
      </div>
    </div>
  );
}
