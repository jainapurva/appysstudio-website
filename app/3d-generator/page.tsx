import Link from 'next/link';
import { ArrowRight, Ruler, Sparkles } from 'lucide-react';
import { AI_GENERATOR, PARAMETRIC_GENERATORS, PARAMETRIC_SUMMARY } from '@/lib/generators';

export const metadata = {
  title: "3D Generator | Appy's Studio",
  description:
    'Make a 3D file to print. Describe it and let AI build it, or set the numbers on one of our parametric products and get an exact file.',
  alternates: { canonical: 'https://appysstudio.com/3d-generator' },
};

export default function GeneratorHubPage() {
  const live = PARAMETRIC_GENERATORS.filter((g) => g.available);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="kicker mb-6">Make something</div>

      <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] mb-5">
        3D Generator
      </h1>

      <p className="text-lg text-ink2 max-w-2xl mb-12">
        Two ways to get a file you can print. Describe a shape and let AI model it, or
        set the numbers on something we already designed and get it built to your
        measurements.
      </p>

      <div className="grid sm:grid-cols-2 gap-5">
        <Link href={AI_GENERATOR.href} className="craft-card relative p-6 sm:p-7 flex flex-col group">
          <span className="price-tag">{AI_GENERATOR.tag}</span>
          <Sparkles className="w-6 h-6 text-clay mb-4" aria-hidden />
          <h2 className="font-display text-2xl mb-2">{AI_GENERATOR.name}</h2>
          <p className="text-ink2 mb-5 flex-1">{AI_GENERATOR.blurb}</p>
          <span className="inline-flex items-center gap-2 text-clay-dark font-bold">
            Describe it
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </Link>

        <Link href={PARAMETRIC_SUMMARY.href} className="craft-card relative p-6 sm:p-7 flex flex-col group">
          <span className="price-tag">Free</span>
          <Ruler className="w-6 h-6 text-clay mb-4" aria-hidden />
          <h2 className="font-display text-2xl mb-2">{PARAMETRIC_SUMMARY.name}</h2>
          <p className="text-ink2 mb-5 flex-1">{PARAMETRIC_SUMMARY.blurb}</p>
          <span className="inline-flex items-center gap-2 text-clay-dark font-bold">
            {live.length === 1 ? '1 product' : `${live.length} products`}
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </span>
        </Link>
      </div>

      <section className="mt-12 border-t border-dashed border-ink/25 pt-8">
        <h2 className="font-display text-2xl mb-3">Which one do I want?</h2>
        <p className="text-ink2 max-w-3xl">
          If the thing in your head doesn&apos;t exist yet — a figure, an ornament, a
          one-off shape — start with the AI generator. If you want something we make,
          sized to your own measurements or your own name, the parametric generator
          builds it exactly rather than approximating it.
        </p>
      </section>
    </main>
  );
}
