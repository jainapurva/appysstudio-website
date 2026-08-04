import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ParametricStudio from '@/components/ParametricStudio';
import { PARAMETRIC_MODELS, findModel } from '@/lib/parametric/models';

// One page for every model in the manifest. Adding a .scad file and an entry
// gives it a page here — there is nothing per-model to write.
export function generateStaticParams() {
  return PARAMETRIC_MODELS.map((model) => ({ slug: model.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const model = findModel(slug);
  if (!model) return {};

  const url = `https://appysstudio.com/3d-generator/parametric/${model.slug}`;
  return {
    title: `${model.name} — free parametric 3D print file | Appy's Studio`,
    description: model.blurb,
    alternates: { canonical: url },
    openGraph: {
      title: `${model.name} — built to your numbers`,
      description: model.blurb,
      url,
      type: 'website',
    },
  };
}

export default async function ParametricModelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const model = findModel(slug);
  if (!model) notFound();

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
        <span className="text-ink">{model.name}</span>
      </nav>

      <div className="kicker mb-5">Free download</div>

      <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mb-4">{model.name}</h1>

      <p className="text-lg text-ink2 max-w-2xl mb-10">{model.intro}</p>

      <ParametricStudio
        slug={model.slug}
        params={model.params}
        notes={model.notes}
        printHint={model.printHint}
      />
    </main>
  );
}
