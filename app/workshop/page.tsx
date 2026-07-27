import Link from 'next/link';
import {
  Calendar, Clock, MapPin, Users, Laptop, Sparkles, Printer,
  Box, CheckCircle2, Gift, ArrowRight, Wand2, Eye,
} from 'lucide-react';
import WorkshopRegistration from '@/components/WorkshopRegistration';
import { WORKSHOP, VENUE_ONE_LINE, VENUE_MAP_URL, AGENDA, TAKEAWAYS, REQUIREMENTS, FAQ } from '@/lib/workshop';

export const metadata = {
  title: `3D Printing Workshop — ${WORKSHOP.date} | Appy's Studio`,
  description: `A hands-on ${WORKSHOP.durationHours}-hour 3D printing workshop in Newark, CA. Learn to design with simple AI tools, print your design live, and take it home. $${WORKSHOP.pricePerSeat} per person, ages ${WORKSHOP.minAge}+, beginners welcome. Only ${WORKSHOP.capacity} seats.`,
  keywords: ['3D printing workshop', 'AI 3D design', 'Newark CA workshop', 'beginner 3D printing class', 'Bay Area maker workshop'],
  alternates: { canonical: 'https://appysstudio.com/workshop' },
  openGraph: {
    title: `3D Printing Workshop — Idea to Object with AI`,
    description: `${WORKSHOP.date}, ${WORKSHOP.startTime}–${WORKSHOP.endTime} in Newark, CA. Design with AI, print it live, take it home. $${WORKSHOP.pricePerSeat} · ${WORKSHOP.capacity} seats only.`,
    url: 'https://appysstudio.com/workshop',
    type: 'website',
  },
};

const eventJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationEvent',
  name: WORKSHOP.title,
  description: `A hands-on ${WORKSHOP.durationHours}-hour workshop covering the full journey from an idea to a 3D printed product, using simple AI design tools. Beginners welcome, ages ${WORKSHOP.minAge}+.`,
  startDate: WORKSHOP.isoStart,
  endDate: WORKSHOP.isoEnd,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  maximumAttendeeCapacity: WORKSHOP.capacity,
  typicalAgeRange: `${WORKSHOP.minAge}-`,
  location: {
    '@type': 'Place',
    name: WORKSHOP.venue.name,
    address: {
      '@type': 'PostalAddress',
      addressLocality: WORKSHOP.venue.city,
      addressRegion: WORKSHOP.venue.state,
      addressCountry: 'US',
    },
  },
  organizer: {
    '@type': 'Organization',
    name: "Appy's Studio",
    url: 'https://appysstudio.com',
  },
  offers: {
    '@type': 'Offer',
    price: String(WORKSHOP.pricePerSeat),
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    url: 'https://appysstudio.com/workshop#register',
  },
};

const JOURNEY = [
  { icon: Sparkles, label: 'Your idea', detail: 'Described in plain English' },
  { icon: Wand2, label: 'AI designs it', detail: 'No CAD, no experience' },
  { icon: Eye, label: 'You refine it', detail: 'Make it actually printable' },
  { icon: Printer, label: 'It prints live', detail: 'Watch it come off the bed' },
  { icon: Gift, label: 'You take it home', detail: 'A real object, yours' },
];

export default function WorkshopPage() {
  return (
    <div className="bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-dashed border-ink/25">
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-14 relative">
          <div className="kicker mb-6">
            <Sparkles className="w-4 h-4" />
            One-day workshop · {WORKSHOP.capacity} seats only
          </div>

          <h1 className="text-[clamp(38px,5vw,60px)] text-ink mb-5 leading-[1.08] max-w-3xl">
            From an idea in your head to{' '}
            <span className="text-clay">a thing in your hand</span>
            {' '}— in four hours.
          </h1>

          <p className="text-lg text-ink2 leading-[1.65] max-w-2xl mb-8">
            A hands-on 3D printing workshop where you&apos;ll design something using simple AI
            tools — no CAD, no experience, no design background — then watch it print live
            and take it home with you. If you can describe an idea out loud, you can build
            it here.
          </p>

          {/* Key facts */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8 max-w-3xl">
            {[
              { icon: Calendar, label: WORKSHOP.date.replace(', 2026', ''), sub: '2026' },
              { icon: Clock, label: `${WORKSHOP.startTime} – ${WORKSHOP.endTime}`, sub: `${WORKSHOP.durationHours} hours` },
              { icon: MapPin, label: `${WORKSHOP.venue.city}, ${WORKSHOP.venue.state}`, sub: 'In person' },
              { icon: Users, label: `$${WORKSHOP.pricePerSeat} per person`, sub: `Ages ${WORKSHOP.minAge}+` },
            ].map(fact => (
              <div key={fact.label} className="bg-white rounded-xl p-4 shadow-[0_2px_0_rgba(61,47,36,.1)]">
                <fact.icon className="w-4 h-4 text-clay mb-2" />
                <p className="font-bold text-ink text-sm leading-tight">{fact.label}</p>
                <p className="text-xs text-ink2 mt-0.5">{fact.sub}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="#register"
              className="btn-clay"
            >
              Reserve your seat — ${WORKSHOP.pricePerSeat}
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#agenda"
              className="btn-line"
            >
              See what we cover
            </a>
          </div>
        </div>
      </section>

      {/* ── Laptop requirement — the one thing they must bring ── */}
      <section className="bg-butter/40 border-b border-dashed border-ink/25">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-10 h-10 bg-butter rounded-xl flex items-center justify-center shrink-0">
              <Laptop className="w-5 h-5 text-clay-dark" />
            </div>
            <p className="text-sm text-ink leading-relaxed">
              <strong className="font-bold">Please bring your own laptop.</strong> It&apos;s the one
              thing we need from you — you&apos;ll be designing on your own machine so you keep
              everything you make. Any Mac, Windows laptop, or Chromebook works. Everything
              else (printers, filament, software, materials) is provided.
            </p>
          </div>
        </div>
      </section>

      {/* ── The journey ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-[clamp(28px,3.5vw,38px)] text-ink mb-3">
          We cover every step. Nothing skipped.
        </h2>
        <p className="text-ink2 leading-relaxed max-w-2xl mb-10">
          Most workshops hand you a file someone else made and let you press print. Not this
          one. You&apos;ll go the whole distance — from a vague idea to a finished object —
          and understand every step along the way.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {JOURNEY.map((step, i) => (
            <div key={step.label} className="craft-card relative p-5">
              <div className="w-10 h-10 bg-butter/60 rounded-xl flex items-center justify-center mb-3">
                <step.icon className="w-5 h-5 text-clay" />
              </div>
              <p className="text-[11px] font-bold text-sage-dark tracking-[.1em] mb-1">STEP {i + 1}</p>
              <p className="font-bold text-ink text-sm leading-tight mb-1">{step.label}</p>
              <p className="text-xs text-ink2 leading-relaxed">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI design pitch ── */}
      <section className="bg-paper2 border-y border-dashed border-ink/25">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="kicker !text-xs mb-5">
                <Wand2 className="w-3.5 h-3.5" />
                The part that used to be hard
              </div>
              <h2 className="font-display text-[clamp(28px,3.5vw,38px)] text-ink mb-4 leading-tight">
                Designing used to take years to learn. Now it takes a sentence.
              </h2>
              <div className="space-y-4 text-ink2 leading-relaxed">
                <p>
                  The reason most people never make a physical product isn&apos;t the printer —
                  printers are easy. It&apos;s the design. Traditional CAD software is genuinely
                  hard, and learning it takes months you don&apos;t have.
                </p>
                <p>
                  <strong className="text-ink">That barrier is gone.</strong> We&apos;ll teach you
                  the AI tools that turn a plain-English description into a real 3D model. You
                  say what you want; the software models it. Then we show you how to take that
                  output and make it genuinely printable — the judgement that AI can&apos;t do
                  for you yet, and the part that separates a nice render from a real object.
                </p>
                <p className="text-sm text-ink2/80">
                  The tools we use are free or have generous free tiers, so you can keep making
                  things the moment you get home.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_3px_0_rgba(61,47,36,.12),0_10px_24px_rgba(61,47,36,.08)] p-6">
              <p className="text-xs font-bold text-sage-dark uppercase tracking-[.14em] mb-4">What this looks like</p>
              <div className="space-y-3">
                <div className="bg-paper rounded-xl p-4">
                  <p className="text-[11px] font-bold text-ink2/70 tracking-[.1em] mb-1.5">YOU SAY</p>
                  <p className="text-sm hand-note !text-ink2">
                    &ldquo;A holder for my headphones that clamps onto the edge of my desk.&rdquo;
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="w-8 h-8 bg-butter/60 rounded-lg flex items-center justify-center">
                    <Wand2 className="w-4 h-4 text-clay" />
                  </div>
                </div>
                <div className="bg-paper rounded-xl p-4">
                  <p className="text-[11px] font-bold text-clay tracking-[.1em] mb-1.5">YOU GET</p>
                  <p className="text-sm text-ink2">
                    A 3D model on your screen. You tweak it, we make sure it prints, and it
                    comes off the printer before you leave.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2 text-ink2">
                  <Box className="w-4 h-4 shrink-0" />
                  <p className="text-xs leading-relaxed">No CAD. No modelling. No experience.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Agenda ── */}
      <section id="agenda" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20">
        <h2 className="font-display text-[clamp(28px,3.5vw,38px)] text-ink mb-3">
          The four hours, hour by hour
        </h2>
        <p className="text-ink2 leading-relaxed max-w-2xl mb-10">
          {WORKSHOP.startTime} to {WORKSHOP.endTime}, {WORKSHOP.date}. Hands on keyboards for
          most of it.
        </p>

        <div className="space-y-3">
          {AGENDA.map((item, i) => (
            <div
              key={item.title}
              className="bg-white rounded-2xl shadow-[0_2px_0_rgba(61,47,36,.1)] p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6"
            >
              <div className="sm:w-32 shrink-0">
                <div className="flex items-center gap-2 sm:block">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-ink bg-white text-ink text-xs font-bold sm:mb-2">
                    {i + 1}
                  </span>
                  <p className="font-mono text-sm font-semibold text-sage-dark">{item.time}</p>
                </div>
              </div>
              <div>
                <h3 className="font-sans font-bold text-ink mb-1.5">{item.title}</h3>
                <p className="text-sm text-ink2 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Goodie + takeaways ── */}
      <section className="bg-paper2 border-y border-dashed border-ink/25">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <div className="w-12 h-12 bg-butter rounded-xl flex items-center justify-center mb-5">
                <Gift className="w-6 h-6 text-clay-dark" />
              </div>
              <h2 className="font-display text-[clamp(28px,3.5vw,38px)] text-ink mb-4 leading-tight">
                You leave with the thing you made.
              </h2>
              <p className="text-ink2 leading-relaxed mb-4">
                Not a photo of it. Not a file to print later. The actual object — designed by
                you, printed on the day, in your bag when you walk out. It&apos;s included in
                the ticket, not an upsell.
              </p>
              <p className="text-ink2 leading-relaxed">
                That&apos;s the whole point of the four hours: proving to yourself that the gap
                between &ldquo;I had an idea&rdquo; and &ldquo;I&apos;m holding it&rdquo; is now
                a single afternoon.
              </p>
            </div>

            <div>
              <h3 className="font-display text-ink mb-5 text-[22px]">What you take away</h3>
              <ul className="space-y-3.5">
                {TAKEAWAYS.map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="text-craft-orange shrink-0 mt-0.5 text-sm">✳︎</span>
                    <span className="text-ink2 text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-[clamp(28px,3.5vw,38px)] text-ink mb-3">
          What you need to bring
        </h2>
        <p className="text-ink2 leading-relaxed max-w-2xl mb-8">
          Short list. We handle the rest.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {REQUIREMENTS.map((req, i) => (
            <div
              key={req}
              className={`rounded-2xl p-5 ${i === 0 ? 'bg-butter/40 border-2 border-dashed border-clay' : 'bg-white shadow-[0_2px_0_rgba(61,47,36,.1)]'}`}
            >
              <div className="flex items-start gap-3">
                {i === 0
                  ? <Laptop className="w-5 h-5 text-clay-dark shrink-0 mt-0.5" />
                  : <CheckCircle2 className="w-5 h-5 text-sage shrink-0 mt-0.5" />}
                <p className={`text-sm leading-relaxed ${i === 0 ? 'text-ink' : 'text-ink2'}`}>{req}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Registration ── */}
      <section id="register" className="bg-paper2 border-y border-dashed border-ink/25 scroll-mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div className="md:sticky md:top-24">
              <h2 className="font-display text-[clamp(28px,3.5vw,38px)] text-ink mb-4 leading-tight">
                Register
              </h2>
              <p className="text-ink2 leading-relaxed mb-6">
                {WORKSHOP.capacity} seats, because everyone gets real printer time and real
                attention. Once they&apos;re gone, they&apos;re gone.
              </p>

              <div className="space-y-3 mb-6">
                {[
                  { icon: Calendar, label: 'Date', value: WORKSHOP.date },
                  { icon: Clock, label: 'Time', value: `${WORKSHOP.startTime} – ${WORKSHOP.endTime} (${WORKSHOP.durationHours} hours)` },
                  { icon: MapPin, label: 'Location', value: VENUE_ONE_LINE, href: VENUE_MAP_URL },
                  { icon: Users, label: 'Price', value: `$${WORKSHOP.pricePerSeat} per person — includes your printed goodie` },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-[0_2px_0_rgba(61,47,36,.1)]">
                    <row.icon className="w-4 h-4 text-clay shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] font-bold text-sage-dark uppercase tracking-[.14em] mb-0.5">{row.label}</p>
                      {row.href ? (
                        <a href={row.href} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-ink hover:text-clay transition-colors">
                          {row.value} <span className="text-clay">↗</span>
                        </a>
                      ) : (
                        <p className="text-sm font-semibold text-ink">{row.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 bg-butter/40 rounded-xl p-4 border-2 border-dashed border-clay">
                <Laptop className="w-4 h-4 text-clay-dark shrink-0 mt-0.5" />
                <p className="text-sm text-ink leading-relaxed">
                  <strong>Don&apos;t forget your laptop.</strong> One per attendee.
                </p>
              </div>
            </div>

            <WorkshopRegistration />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="font-display text-[clamp(28px,3.5vw,38px)] text-ink mb-10 text-center">
          Questions
        </h2>
        <div className="space-y-3">
          {FAQ.map(item => (
            <details key={item.q} className="group bg-white rounded-2xl shadow-[0_2px_0_rgba(61,47,36,.1)] overflow-hidden">
              <summary className="flex items-center justify-between gap-4 p-5 cursor-pointer list-none font-bold text-ink transition-colors [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="font-display text-clay text-2xl font-normal shrink-0 transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-5 pb-5 -mt-1">
                <p className="text-sm text-ink2 leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-clay relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="font-display text-[clamp(30px,4vw,42px)] text-white mb-4 leading-tight">
            Four hours from now, you could be holding it.
          </h2>
          <p className="text-paper/85 leading-relaxed mb-8 max-w-xl mx-auto">
            {WORKSHOP.date} · {WORKSHOP.startTime}–{WORKSHOP.endTime} · {WORKSHOP.venue.city}, {WORKSHOP.venue.state}.
            ${WORKSHOP.pricePerSeat} a seat, {WORKSHOP.capacity} seats, everything included.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#register"
              className="btn-cream"
            >
              Reserve your seat
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/#shop"
              className="inline-flex items-center justify-center border-[1.5px] border-dashed border-paper/50 hover:border-paper text-paper px-8 py-4 rounded-full font-bold transition-all"
            >
              Browse the shop
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
