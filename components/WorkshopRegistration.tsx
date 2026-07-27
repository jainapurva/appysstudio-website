'use client';

import { useEffect, useState } from 'react';
import { Loader2, Laptop, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WORKSHOP } from '@/lib/workshop';

const EXPERIENCE_OPTIONS = [
  'Total beginner — never touched 3D design',
  'I have tinkered a little',
  'I design already, but not with AI',
  'I own a 3D printer',
];

export default function WorkshopRegistration() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [seats, setSeats] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [attendeeNames, setAttendeeNames] = useState('');
  const [experience, setExperience] = useState('');
  const [notes, setNotes] = useState('');
  const [laptopOk, setLaptopOk] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/workshop/seats')
      .then(res => res.json())
      .then(data => setRemaining(data.remaining))
      .catch(() => setRemaining(null));
  }, []);

  const soldOut = remaining === 0;
  const maxSeats = Math.min(remaining ?? WORKSHOP.capacity, 4);
  const total = seats * WORKSHOP.pricePerSeat;
  const canSubmit = name.trim() && email.trim() && laptopOk && ageOk && !submitting && !soldOut;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/workshop/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, seats, attendeeNames, experience, notes }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        if (typeof data.remaining === 'number') setRemaining(data.remaining);
        if (data.soldOut) setRemaining(0);
        setSubmitting(false);
        return;
      }

      if (data.url) {
        // The success page reads this back to confirm payment with Square.
        sessionStorage.setItem('workshopSquareOrderId', data.squareOrderId);
        window.location.href = data.url;
        return;
      }

      // Square isn't configured — registration saved, we'll collect payment manually.
      setPendingId(data.registrationId);
      setSubmitting(false);
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  if (pendingId) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_3px_0_rgba(61,47,36,.12),0_10px_24px_rgba(61,47,36,.08)] p-8 text-center">
        <span className="text-[40px] text-craft-orange craft-spin !animate-[craft-spin_8s_linear_infinite] block mx-auto mb-2 w-fit">✳︎</span>
        <h3 className="font-display text-[24px] text-ink mb-2">Registration received</h3>
        <p className="text-ink2 text-sm leading-relaxed mb-4">
          Your reference is <code className="bg-paper2 px-2 py-1 rounded font-mono text-xs">{pendingId}</code>.
          We&apos;ll email you shortly to arrange payment and confirm your seat.
        </p>
      </div>
    );
  }

  if (soldOut) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_3px_0_rgba(61,47,36,.12),0_10px_24px_rgba(61,47,36,.08)] p-8 text-center">
        <div className="w-12 h-12 bg-paper2 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-ink2" />
        </div>
        <h3 className="font-display text-[24px] text-ink mb-2">This workshop is full</h3>
        <p className="text-ink2 text-sm leading-relaxed">
          All {WORKSHOP.capacity} seats are taken. Email us at{' '}
          <a href="mailto:appysstudioca@gmail.com" className="text-clay font-semibold hover:underline">
            appysstudioca@gmail.com
          </a>{' '}
          to join the waitlist or hear about the next date.
        </p>
      </div>
    );
  }

  const inputClass =
    'craft-input text-sm';
  const labelClass = 'block text-[12.5px] font-bold uppercase tracking-[.1em] text-ink mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_3px_0_rgba(61,47,36,.12),0_10px_24px_rgba(61,47,36,.08)]">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="font-display text-[26px] text-ink">Reserve your seat</h3>
        {remaining !== null && remaining <= 5 && (
          <span className="text-xs font-bold text-ink bg-butter px-2.5 py-1 rounded-full rotate-2">
            {remaining} left
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ws-name" className={labelClass}>Full name *</label>
            <input id="ws-name" type="text" required value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Jane Doe" />
          </div>
          <div>
            <label htmlFor="ws-email" className={labelClass}>Email *</label>
            <input id="ws-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="jane@example.com" />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="ws-phone" className={labelClass}>
              Phone <span className="font-normal normal-case tracking-normal text-ink2/70">(optional)</span>
            </label>
            <input id="ws-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="(555) 123-4567" />
          </div>
          <div>
            <label htmlFor="ws-seats" className={labelClass}>Number of seats</label>
            <select id="ws-seats" value={seats} onChange={e => setSeats(Number(e.target.value))} className={inputClass}>
              {Array.from({ length: Math.max(1, maxSeats) }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'seat' : 'seats'} — ${n * WORKSHOP.pricePerSeat}</option>
              ))}
            </select>
          </div>
        </div>

        {seats > 1 && (
          <div>
            <label htmlFor="ws-attendees" className={labelClass}>Who else is coming?</label>
            <input id="ws-attendees" type="text" value={attendeeNames} onChange={e => setAttendeeNames(e.target.value)} className={inputClass} placeholder="Names of the other attendees" />
            <p className="text-xs text-clay-dark mt-1.5 font-medium">Each attendee needs their own laptop.</p>
          </div>
        )}

        <div>
          <label htmlFor="ws-experience" className={labelClass}>
            Your experience level <span className="font-normal normal-case tracking-normal text-ink2/70">(optional)</span>
          </label>
          <select id="ws-experience" value={experience} onChange={e => setExperience(e.target.value)} className={inputClass}>
            <option value="">Prefer not to say</option>
            {EXPERIENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <p className="text-xs text-ink2/80 mt-1.5">Helps us pitch the session right. Beginners are the default — no wrong answer.</p>
        </div>

        <div>
          <label htmlFor="ws-notes" className={labelClass}>
            Anything you want to make, or need us to know? <span className="font-normal normal-case tracking-normal text-ink2/70">(optional)</span>
          </label>
          <textarea id="ws-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} resize-none`} placeholder="An idea you'd like to print, accessibility needs, dietary notes..." />
        </div>
      </div>

      <div className="mt-6 space-y-3 bg-paper rounded-xl p-4 border-2 border-dashed border-clay/50">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input type="checkbox" checked={laptopOk} onChange={e => setLaptopOk(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-clay cursor-pointer" />
          <span className="text-sm text-ink2 leading-relaxed">
            <strong className="text-ink">I&apos;ll bring my own laptop.</strong> I understand this is required — the workshop is hands-on and I&apos;ll be designing on my own machine.
            {seats > 1 && <span className="text-clay-dark font-medium"> All {seats} attendees will bring one.</span>}
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input type="checkbox" checked={ageOk} onChange={e => setAgeOk(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-clay cursor-pointer" />
          <span className="text-sm text-ink2 leading-relaxed">
            <strong className="text-ink">Everyone attending is {WORKSHOP.minAge} or older.</strong> Attendees under 16 will be accompanied by a parent or guardian.
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 bg-craft-orange/15 text-[#b3402a] rounded-xl p-3.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-dashed border-ink/25">
        <div className="flex items-center justify-between mb-4">
          <span className="text-ink2 font-medium">
            {seats} × ${WORKSHOP.pricePerSeat}
          </span>
          <span className="font-display text-[26px] text-clay">${total}</span>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-clay w-full"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Starting checkout…</>
          ) : (
            <>Register &amp; pay ${total}</>
          )}
        </button>

        <p className="text-xs text-ink2/80 text-center mt-3 flex items-center justify-center gap-1.5">
          <Laptop className="w-3.5 h-3.5" />
          Secure payment via Square. Full refund up to 7 days before.
        </p>
      </div>
    </form>
  );
}
