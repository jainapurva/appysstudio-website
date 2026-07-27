'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Menu, X, User, LogOut, LogIn } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const NAV_LINKS = [
  { label: 'The Shelf', href: '/#shop' },
  { label: '✨ AI 3D Generator', href: '/3d-generator', badge: 'New' },
  { label: 'Workshop', href: '/workshop', badge: 'Aug 22' },
  { label: 'Custom', href: '/#custom' },
  { label: 'Robotics', href: '/robotics', badge: 'Soon' },
  { label: 'FAQ', href: '/#faq' },
];

export default function Navbar() {
  const { itemCount } = useCart();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  // Close the user dropdown on outside click
  useEffect(() => {
    if (!userOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userOpen]);

  const initial = session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || '?';

  return (
    <nav className="sticky top-0 z-50 bg-paper/90 backdrop-blur-md border-b border-dashed border-ink/25">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          <Link href="/" className="flex items-center gap-2.5 font-display text-2xl text-ink">
            <Image src="/logo-warm.png" alt="Appy's Studio" width={38} height={38} className="rounded-[10px] -rotate-[4deg]" />
            Appy&apos;s Studio
          </Link>

          <div className="hidden md:flex items-center gap-1.5">
            {NAV_LINKS.map(link => (
              <Link key={link.label} href={link.href} className="text-ink2 hover:text-clay-dark hover:bg-clay/10 hover:-rotate-[1.5deg] px-3.5 py-2 rounded-full font-medium transition-all text-[15px] flex items-center gap-1.5">
                {link.label}
                {'badge' in link && link.badge && (
                  <span className="text-[10px] font-bold bg-butter text-ink px-1.5 py-0.5 rounded-full">{link.badge}</span>
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/cart" className="flex items-center gap-2 bg-ink text-paper px-[18px] py-2.5 rounded-full font-bold text-sm transition-transform hover:rotate-2 hover:scale-105">
              🧺 Basket · {itemCount}
            </Link>

            {session?.user ? (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserOpen(o => !o)}
                  aria-label="Account menu"
                  className="w-10 h-10 rounded-full border-2 border-ink overflow-hidden flex items-center justify-center bg-clay text-white font-bold transition-transform hover:-rotate-3 hover:scale-105"
                >
                  {session.user.image ? (
                    <Image src={session.user.image} alt="" width={36} height={36} className="w-full h-full object-cover" />
                  ) : (
                    initial
                  )}
                </button>

                {userOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-60 bg-paper rounded-2xl shadow-[0_3px_0_rgba(61,47,36,.12),0_16px_36px_rgba(61,47,36,.2)] border border-dashed border-ink/25 overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-dashed border-ink/25">
                      <p className="font-bold text-ink text-sm truncate">{session.user.name}</p>
                      <p className="text-xs text-ink2 truncate">{session.user.email}</p>
                    </div>
                    <Link
                      href="/account"
                      onClick={() => setUserOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-ink2 hover:bg-clay/10 hover:text-clay-dark transition-colors"
                    >
                      <User className="w-4 h-4" /> My Account
                    </Link>
                    <button
                      onClick={() => { setUserOpen(false); signOut({ callbackUrl: '/' }); }}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-ink2 hover:bg-clay/10 hover:text-clay-dark transition-colors w-full text-left"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn(undefined, { callbackUrl: '/account' })}
                className="hidden sm:flex items-center gap-1.5 border-2 border-ink text-ink px-4 py-2 rounded-full font-bold text-sm shadow-[3px_3px_0_var(--color-butter)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--color-craft-orange)]"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
            )}

            <button className="md:hidden p-2 text-ink2 hover:text-ink" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-paper border-t border-dashed border-ink/25 px-4 py-3 space-y-1">
          {NAV_LINKS.map(link => (
            <Link key={link.label} href={link.href} className="flex items-center gap-2 text-ink2 hover:text-clay-dark font-medium py-2.5 px-3 rounded-xl hover:bg-clay/10" onClick={() => setMenuOpen(false)}>
              {link.label}
              {'badge' in link && link.badge && (
                <span className="text-[10px] font-bold bg-butter text-ink px-1.5 py-0.5 rounded-full">{link.badge}</span>
              )}
            </Link>
          ))}
          {!session?.user && (
            <button
              onClick={() => { setMenuOpen(false); signIn(undefined, { callbackUrl: '/account' }); }}
              className="flex items-center gap-2 text-ink2 hover:text-clay-dark font-medium py-2.5 px-3 rounded-xl hover:bg-clay/10 w-full text-left"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
