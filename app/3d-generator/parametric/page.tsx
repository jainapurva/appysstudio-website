import Link from 'next/link';
import { ArrowRight, Ruler } from 'lucide-react';
import { PARAMETRIC_GENERATORS } from '@/lib/generators';

export const metadata = {
  title: "Parametric 3D Generator | Appy's Studio",
  description:
    'Set the numbers, get the exact file. Our products, built to your measurements and ready to slice.',
  alternates: { canonical: 'https://appysstudio.com/3d-generator/parametric' },
};

export default function ParametricIndexPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <nav className="mb-6 text-sm text-ink2">
        <Link href="/3d-generator" className="hover:text-clay-dark">
          3D Generator
        </Link>
        <span className="mx-2 text-ink2/50">/</span>
        <span className="text-ink">Parametric</span>
      </nav>

      <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mb-5">
        Built to your numbers
      </h1>

      <p className="text-lg text-ink2 max-w-2xl mb-12">
        Nothing here is a stock file with a label slapped on it. You give the input —
        a name, a set of dimensions — and the geometry is built around it, plated and
        ready to slice.
      </p>

      <div className="grid sm:grid-cols-2 gap-5">
        {PARAMETRIC_GENERATORS.map((g) =>
          g.available ? (
            <Link key={g.slug} href={g.href} className="craft-card relative p-6 flex flex-col group">
              <span className="price-tag">{g.tag}</span>
              <Ruler className="w-5 h-5 text-clay mb-4" aria-hidden />
              <h2 className="font-display text-xl mb-2">{g.name}</h2>
              <p className="text-sm text-ink2 mb-5 flex-1">{g.blurb}</p>
              <span className="inline-flex items-center gap-2 text-clay-dark font-bold text-sm">
                Make one
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ) : (
            <div key={g.slug} className="craft-card relative p-6 flex flex-col opacity-60">
              <span className="price-tag">{g.tag}</span>
              <Ruler className="w-5 h-5 text-ink2 mb-4" aria-hidden />
              <h2 className="font-display text-xl mb-2">{g.name}</h2>
              <p className="text-sm text-ink2 flex-1">{g.blurb}</p>
            </div>
          )
        )}
      </div>

      <section className="mt-12 craft-card p-6 sm:p-8">
        <h2 className="font-display text-2xl mb-2">Want one of our other products made this way?</h2>
        <p className="text-ink2 mb-5">
          Tell us which and what you&apos;d want to change about it — size, compartments,
          a name on it — and it moves up the list.
        </p>
        <Link href="/#custom" className="btn-clay inline-flex">
          Tell us
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
