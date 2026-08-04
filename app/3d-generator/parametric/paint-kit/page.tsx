import Link from 'next/link';
import PaintKitStudio from '@/components/PaintKitStudio';

export const metadata = {
  title: "Paint Kit Maker — turn any picture into a paint-it-yourself plaque | Appy's Studio",
  description:
    'Upload a drawing or a photo and get a flat 3D-printable plaque with the outline raised, ready to colour in with paint markers.',
  alternates: { canonical: 'https://appysstudio.com/3d-generator/parametric/paint-kit' },
  openGraph: {
    title: 'Paint Kit Maker — any picture, printed to colour in',
    description:
      'Upload a picture, get a plaque with the outline raised off a white plate. Print it, paint it.',
    url: 'https://appysstudio.com/3d-generator/parametric/paint-kit',
    type: 'website',
  },
};

export default function PaintKitPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <nav className="mb-6 text-sm text-ink2">
        <Link href="/3d-generator" className="hover:text-clay-dark">
          3D Generator
        </Link>
        <span className="mx-2 text-ink2/50">/</span>
        <Link href="/3d-generator/parametric" className="hover:text-clay-dark">
          Parametric
        </Link>
        <span className="mx-2 text-ink2/50">/</span>
        <span className="text-ink">Paint Kit Maker</span>
      </nav>

      <div className="kicker mb-5">Free download</div>

      <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mb-4">
        Any picture, printed to{' '}
        <span className="squig">
          colour in
          <svg viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden>
            <path d="M2 11 C 20 3, 38 3, 52 9 S 84 14, 98 6" />
          </svg>
        </span>
      </h1>

      <p className="text-lg text-ink2 max-w-2xl mb-10">
        The paint-it-yourself kits we make by hand, made from your picture instead of ours. Drop
        in a drawing and the outline is traced, raised off a flat white plate, and handed back as
        a print file — the raised line keeps the paint where it belongs, the way a colouring book
        does.
      </p>

      <PaintKitStudio />
    </main>
  );
}
