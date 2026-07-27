import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Swayat AI — by Appy's Studio",
  description: "Swayat AI is a product of Appy's Studio. Appy's Studio builds 3D printed products and AI-powered tools.",
  alternates: { canonical: 'https://appysstudio.com/swayat' },
};

export default function SwayatPage() {
  return (
    <main className="min-h-screen bg-ink text-paper flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <h1 className="font-display text-[36px] mb-4">Swayat AI</h1>
        <p className="text-foot-text text-lg mb-6">
          Swayat AI is a product of{' '}
          <Link href="/" className="text-craft-orange hover:underline">
            Appy&apos;s Studio
          </Link>
          .
        </p>
        <p className="text-foot-text/70 mb-8">
          Appy&apos;s Studio is a 3D printing &amp; robotics studio based in Canada, building custom printed products and AI-powered tools.
        </p>
        <a
          href="https://swayat.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-cream"
        >
          Visit Swayat AI →
        </a>
      </div>
    </main>
  );
}
