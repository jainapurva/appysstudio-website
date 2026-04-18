import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Custom Swag — Magnets, Keychains & NFC Badges',
  description: 'Design your own custom 3D printed swag. Fridge magnets, keychains, and NFC badges with your logo or design. Perfect for businesses, events, and personal branding.',
  alternates: { canonical: 'https://appysstudio.com/custom-swag' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
