import Link from 'next/link';
import Image from 'next/image';
import { Mail, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-400 border-t border-stone-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2.5 text-stone-100 font-bold text-xl mb-4">
              <Image src="/logo.png" alt="Appy's Studio" width={36} height={36} className="rounded-md" />
              Appy&apos;s Studio
            </div>
            <p className="text-sm text-stone-400 max-w-xs leading-relaxed">
              3D printing &amp; robotics studio. From desk organizers to custom NFC swag to 3D printed robots — we&apos;ve shipped 4,000+ pieces and counting.
            </p>
            <div className="flex gap-3 mt-5">
              <a href="mailto:appysstudioca@gmail.com" className="w-10 h-10 bg-stone-800 hover:bg-amber-600 rounded-xl flex items-center justify-center transition-colors">
                <Mail className="w-4 h-4" />
              </a>
              <a href="https://www.instagram.com/appysstudio/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-stone-800 hover:bg-amber-600 rounded-xl flex items-center justify-center transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 bg-stone-800 hover:bg-amber-600 rounded-xl flex items-center justify-center transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-stone-100 font-semibold mb-4 text-sm uppercase tracking-wider">3D Printing</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/#shop" className="hover:text-amber-400 transition-colors">All Products</Link></li>
              <li><Link href="/#how" className="hover:text-amber-400 transition-colors">How It Works</Link></li>
              <li><Link href="/#custom" className="hover:text-amber-400 transition-colors">Custom Print</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-stone-100 font-semibold mb-4 text-sm uppercase tracking-wider">More</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/robotics" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">Robotics <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">Soon</span></Link></li>
              <li><Link href="/#faq" className="hover:text-amber-400 transition-colors">FAQ</Link></li>
              <li><a href="mailto:appysstudioca@gmail.com" className="hover:text-amber-400 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-700 mt-12 pt-8 text-sm text-stone-500 flex flex-col sm:flex-row justify-between gap-2">
          <p>&copy; {new Date().getFullYear()} Appy&apos;s Studio. All rights reserved.</p>
          <p>
            <a href="https://swayat.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">Swayat AI</a>
            {' '}is a product of Appy&apos;s Studio.
          </p>
        </div>
      </div>
    </footer>
  );
}
