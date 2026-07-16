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
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-stone-900 mb-2">Registration received</h3>
        <p className="text-stone-600 text-sm leading-relaxed mb-4">
          Your reference is <code className="bg-stone-100 px-2 py-1 rounded font-mono text-xs">{pendingId}</code>.
          We&apos;ll email you shortly to arrange payment and confirm your seat.
        </p>
      </div>
    );
  }

  if (soldOut) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6 text-stone-500" />
        </div>
        <h3 className="text-xl font-bold text-stone-900 mb-2">This workshop is full</h3>
        <p className="text-stone-600 text-sm leading-relaxed">
          All {WORKSHOP.capacity} seats are taken. Email us at{' '}
          <a href="mailto:appysstudioca@gmail.com" className="text-purple-600 font-semibold hover:underline">
            appysstudioca@gmail.com
          </a>{' '}
          to join the waitlist or hear about the next date.
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all';
  const labelClass = 'block text-sm font-semibold text-stone-700 mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="text-2xl font-bold text-stone-900">Reserve your seat</h3>
        {remaining !== null && remaining <= 5 && (
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full ring-1 ring-amber-600/20">
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
              Phone <span className="font-normal text-stone-400">(optional)</span>
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
            <p className="text-xs text-amber-700 mt-1.5 font-medium">Each attendee needs their own laptop.</p>
          </div>
        )}

        <div>
          <label htmlFor="ws-experience" className={labelClass}>
            Your experience level <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <select id="ws-experience" value={experience} onChange={e => setExperience(e.target.value)} className={inputClass}>
            <option value="">Prefer not to say</option>
            {EXPERIENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <p className="text-xs text-stone-400 mt-1.5">Helps us pitch the session right. Beginners are the default — no wrong answer.</p>
        </div>

        <div>
          <label htmlFor="ws-notes" className={labelClass}>
            Anything you want to make, or need us to know? <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea id="ws-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={`${inputClass} resize-none`} placeholder="An idea you'd like to print, accessibility needs, dietary notes..." />
        </div>
      </div>

      <div className="mt-6 space-y-3 bg-stone-50 rounded-xl p-4 border border-stone-200">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input type="checkbox" checked={laptopOk} onChange={e => setLaptopOk(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-stone-300 text-purple-600 focus:ring-purple-500/40 cursor-pointer" />
          <span className="text-sm text-stone-700 leading-relaxed">
            <strong className="text-stone-900">I&apos;ll bring my own laptop.</strong> I understand this is required — the workshop is hands-on and I&apos;ll be designing on my own machine.
            {seats > 1 && <span className="text-amber-700 font-medium"> All {seats} attendees will bring one.</span>}
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer group">
          <input type="checkbox" checked={ageOk} onChange={e => setAgeOk(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-stone-300 text-purple-600 focus:ring-purple-500/40 cursor-pointer" />
          <span className="text-sm text-stone-700 leading-relaxed">
            <strong className="text-stone-900">Everyone attending is {WORKSHOP.minAge} or older.</strong> Attendees under 16 will be accompanied by a parent or guardian.
          </span>
        </label>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-stone-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-stone-600 font-medium">
            {seats} × ${WORKSHOP.pricePerSeat}
          </span>
          <span className="text-2xl font-extrabold text-stone-900">${total}</span>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
        >
          {submitting ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Starting checkout…</>
          ) : (
            <>Register &amp; pay ${total}</>
          )}
        </button>

        <p className="text-xs text-stone-400 text-center mt-3 flex items-center justify-center gap-1.5">
          <Laptop className="w-3.5 h-3.5" />
          Secure payment via Square. Full refund up to 7 days before.
        </p>
      </div>
    </form>
  );
}
