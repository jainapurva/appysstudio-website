import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "AI 3D Generator | Appy's Studio",
  description: 'Generate custom 3D models from text or images using AI. Powered by Meshy AI.',
  alternates: { canonical: 'https://appysstudio.com/3d-generator' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
