import Link from 'next/link';
import Image from 'next/image';
import { Mail, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-ink text-foot-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[72px] pb-9">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-12 mb-13">
          <div>
            <div className="flex items-center gap-2.5 text-paper font-display text-[26px] mb-4">
              <Image src="/logo-warm.png" alt="Appy's Studio" width={36} height={36} className="rounded-[9px] -rotate-[4deg]" />
              Appy&apos;s Studio
            </div>
            <p className="text-[14.5px] leading-relaxed max-w-[300px]">
              A little 3D printing &amp; robotics studio. From desk organizers to custom robots — 4,000+ pieces made with love and shipped with care.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="mailto:appysstudioca@gmail.com" aria-label="Email" className="w-10 h-10 bg-white/10 hover:bg-craft-orange hover:text-ink rounded-xl flex items-center justify-center transition-colors">
                <Mail className="w-4 h-4" />
              </a>
              <a href="https://www.instagram.com/appysstudio/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 bg-white/10 hover:bg-craft-orange hover:text-ink rounded-xl flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-paper font-sans font-bold mb-4.5 text-[13px] uppercase tracking-[.14em]">The Shop</h4>
            <ul className="space-y-3 text-[15px]">
              <li><Link href="/#shop" className="hover:text-craft-orange transition-colors">All products</Link></li>
              <li><Link href="/#how" className="hover:text-craft-orange transition-colors">How we make</Link></li>
              <li><Link href="/#custom" className="hover:text-craft-orange transition-colors">Custom prints</Link></li>
              <li><Link href="/workshop" className="hover:text-craft-orange transition-colors">Workshop</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-paper font-sans font-bold mb-4.5 text-[13px] uppercase tracking-[.14em]">Say hello</h4>
            <ul className="space-y-3 text-[15px]">
              <li><a href="mailto:appysstudioca@gmail.com" className="hover:text-craft-orange transition-colors">Email us</a></li>
              <li><a href="https://www.instagram.com/appysstudio/" target="_blank" rel="noopener noreferrer" className="hover:text-craft-orange transition-colors">Instagram</a></li>
              <li><Link href="/#faq" className="hover:text-craft-orange transition-colors">FAQ</Link></li>
              <li><Link href="/robotics" className="hover:text-craft-orange transition-colors flex items-center gap-1.5">Robotics <span className="text-[10px] font-bold bg-butter text-ink px-1.5 py-0.5 rounded-full">Soon</span></Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-dashed border-foot-text/30 pt-7 flex flex-col sm:flex-row justify-between gap-2 text-[13.5px] text-foot-text/70">
          <p>&copy; {new Date().getFullYear()} Appy&apos;s Studio. All rights reserved.</p>
          <p>
            Made in the USA 🇺🇸 ·{' '}
            <a href="https://swayat.com" target="_blank" rel="noopener noreferrer" className="hover:text-craft-orange transition-colors">Swayat AI</a>
            {' '}is a product of Appy&apos;s Studio.
          </p>
        </div>
      </div>
    </footer>
  );
}
