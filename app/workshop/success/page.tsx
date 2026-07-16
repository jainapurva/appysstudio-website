'use client';

import Link from 'next/link';
import { CheckCircle, Loader2, Laptop, Calendar, MapPin, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WORKSHOP, VENUE_ONE_LINE, VENUE_MAP_URL } from '@/lib/workshop';

export default function WorkshopSuccess() {
  const [verifying, setVerifying] = useState(true);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [seats, setSeats] = useState<number>(1);

  useEffect(() => {
    const squareOrderId = sessionStorage.getItem('workshopSquareOrderId');
    if (!squareOrderId) {
      setVerifying(false);
      return;
    }
    sessionStorage.removeItem('workshopSquareOrderId');

    fetch('/api/workshop/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ squareOrderId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.registrationId) setRegistrationId(data.registrationId);
        if (data.seats) setSeats(data.seats);
      })
      .catch(() => {})
      .finally(() => setVerifying(false));
  }, []);

  if (verifying) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-stone-500">Confirming your registration…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-stone-50 px-4 py-16">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-200">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 mb-3">You&apos;re registered!</h1>
          <p className="text-stone-600 leading-relaxed">
            {seats > 1 ? `${seats} seats are` : 'Your seat is'} confirmed for{' '}
            <strong className="text-stone-900">{WORKSHOP.title}</strong>. A confirmation email is
            on its way.
          </p>
          {registrationId && (
            <p className="text-stone-400 text-sm mt-3">
              Reference <code className="bg-stone-100 px-2.5 py-1 rounded-lg font-mono text-xs text-stone-600">{registrationId}</code>
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-4">Save the details</p>
          <div className="space-y-3">
            {[
              { icon: Calendar, label: WORKSHOP.date },
              { icon: Clock, label: `${WORKSHOP.startTime} – ${WORKSHOP.endTime} (${WORKSHOP.durationHours} hours)` },
              { icon: MapPin, label: VENUE_ONE_LINE, href: VENUE_MAP_URL },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3">
                <row.icon className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                {row.href ? (
                  <a href={row.href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-stone-900 hover:text-purple-600 transition-colors">
                    {row.label} <span className="text-purple-600">↗</span>
                  </a>
                ) : (
                  <p className="text-sm font-medium text-stone-900">{row.label}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 mb-8">
          <div className="flex items-start gap-3">
            <Laptop className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 text-sm mb-1">Don&apos;t forget your laptop</p>
              <p className="text-sm text-amber-900/80 leading-relaxed">
                {seats > 1
                  ? `All ${seats} attendees need to bring their own laptop.`
                  : 'You\'ll be designing on your own machine, so bring it along.'}{' '}
                Everything else is provided.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/workshop" className="text-center bg-gradient-to-r from-purple-600 to-purple-500 text-white px-8 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all">
            Back to the workshop
          </Link>
          <Link href="/" className="text-center ring-2 ring-stone-200 hover:ring-stone-300 text-stone-700 px-8 py-3.5 rounded-xl font-bold transition-all bg-white">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
