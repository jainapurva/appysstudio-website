import Link from 'next/link';
import { ArrowRight, Boxes, Layers, Palette, Printer } from 'lucide-react';
import KeycapGenerator from '@/components/KeycapGenerator';
import { MAX_NAME_LENGTH } from '@/lib/keycaps/spec';

export const metadata = {
  title: "Name Keycaps — free 3D print file | Appy's Studio",
  description:
    'Type a name, get a ready-to-print .3mf of keycap letters and a matching tray. Free, instant, made for Bambu Studio.',
  alternates: { canonical: 'https://appysstudio.com/keycaps' },
  openGraph: {
    title: 'Name Keycaps — free 3D print file',
    description:
      'Type a name and download a ready-to-slice .3mf: one keycap per letter, plus a tray sized to fit.',
    url: 'https://appysstudio.com/keycaps',
    type: 'website',
  },
};

const STEPS = [
  { icon: Layers, label: 'Type a name', note: `Up to ${MAX_NAME_LENGTH} letters.` },
  { icon: Boxes, label: 'We build the plate', note: 'Keycaps and tray, arranged and ready.' },
  { icon: Printer, label: 'Slice and print', note: 'Opens straight into Bambu Studio.' },
];

export default function KeycapsPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
      <div className="kicker mb-6">Free download</div>

      <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] mb-5">
        Keycaps with your{' '}
        <span className="squig">
          name
          <svg viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden>
            <path d="M2 11 C 20 3, 38 3, 52 9 S 84 14, 98 6" />
          </svg>
        </span>{' '}
        on them
      </h1>

      <p className="text-lg text-ink2 max-w-2xl mb-10">
        One clicky keycap per letter, plus a tray sized to hold them. Type a name and
        we&apos;ll build the print plate for you — free, no sign-up, straight to your
        downloads folder.
      </p>

      <KeycapGenerator />

      <section className="grid sm:grid-cols-3 gap-4 mt-12">
        {STEPS.map(({ icon: Icon, label, note }) => (
          <div key={label} className="craft-card p-5">
            <Icon className="w-5 h-5 text-clay mb-3" aria-hidden />
            <h2 className="font-display text-xl mb-1">{label}</h2>
            <p className="text-sm text-ink2">{note}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 border-t border-dashed border-ink/25 pt-8">
        <h2 className="font-display text-2xl mb-4">Printing notes</h2>
        <ul className="space-y-2.5 text-ink2">
          <li className="flex gap-3">
            <Palette className="w-4 h-4 mt-1 shrink-0 text-clay" aria-hidden />
            <span>
              Two colours: the keycap body on the first filament, the raised letter on the
              second. One filament works too — the letters just come out the same colour.
            </span>
          </li>
          <li className="flex gap-3">
            <Printer className="w-4 h-4 mt-1 shrink-0 text-clay" aria-hidden />
            <span>
              Keycaps need supports. The file already has tree supports switched on, set up
              for a P1S with a 0.4 nozzle at 0.20 mm.
            </span>
          </li>
          <li className="flex gap-3">
            <Boxes className="w-4 h-4 mt-1 shrink-0 text-clay" aria-hidden />
            <span>
              The tray comes plain, with one slot per letter — nothing engraved on it.
            </span>
          </li>
        </ul>
      </section>

      <section className="mt-12 craft-card p-6 sm:p-8">
        <h2 className="font-display text-2xl mb-2">No printer? We&apos;ll print it.</h2>
        <p className="text-ink2 mb-5">
          Send us the name and we&apos;ll print, clean up and ship the set.
        </p>
        <Link href="/#custom" className="btn-clay inline-flex">
          Ask for a print
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </section>

      <p className="mt-10 text-xs text-ink2/70">
        Keycap model by Love KiKai. Printed for personal use.
      </p>
    </main>
  );
}
