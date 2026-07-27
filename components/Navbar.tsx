'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

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
  const [menuOpen, setMenuOpen] = useState(false);

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
            <button className="md:hidden p-2 text-ink2 hover:text-ink" onClick={() => setMenuOpen(!menuOpen)}>
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
        </div>
      )}
    </nav>
  );
}
