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
      <div className="min-h-[70vh] flex items-center justify-center px-4 bg-paper">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-clay animate-spin mx-auto mb-4" />
          <p className="text-ink2">Confirming your registration…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-paper px-4 py-16">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-butter/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-[40px] text-craft-orange craft-spin !animate-[craft-spin_8s_linear_infinite]">✳︎</span>
          </div>
          <h1 className="font-display text-[clamp(30px,4vw,40px)] text-ink mb-3">You&apos;re registered!</h1>
          <p className="text-ink2 leading-relaxed">
            {seats > 1 ? `${seats} seats are` : 'Your seat is'} confirmed for{' '}
            <strong className="text-ink">{WORKSHOP.title}</strong>. A confirmation email is
            on its way.
          </p>
          {registrationId && (
            <p className="text-ink2/80 text-sm mt-3">
              Reference <code className="bg-paper2 px-2.5 py-1 rounded-lg font-mono text-xs text-ink2">{registrationId}</code>
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-[0_2px_0_rgba(61,47,36,.1)] p-6 mb-4">
          <p className="text-[11px] font-bold text-sage-dark uppercase tracking-[.14em] mb-4">Save the details</p>
          <div className="space-y-3">
            {[
              { icon: Calendar, label: WORKSHOP.date },
              { icon: Clock, label: `${WORKSHOP.startTime} – ${WORKSHOP.endTime} (${WORKSHOP.durationHours} hours)` },
              { icon: MapPin, label: VENUE_ONE_LINE, href: VENUE_MAP_URL },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3">
                <row.icon className="w-4 h-4 text-clay shrink-0 mt-0.5" />
                {row.href ? (
                  <a href={row.href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-ink hover:text-clay transition-colors">
                    {row.label} <span className="text-clay">↗</span>
                  </a>
                ) : (
                  <p className="text-sm font-medium text-ink">{row.label}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-butter/40 rounded-2xl border-2 border-dashed border-clay p-6 mb-8">
          <div className="flex items-start gap-3">
            <Laptop className="w-5 h-5 text-clay-dark shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-ink text-sm mb-1">Don&apos;t forget your laptop</p>
              <p className="text-sm text-ink2 leading-relaxed">
                {seats > 1
                  ? `All ${seats} attendees need to bring their own laptop.`
                  : 'You\'ll be designing on your own machine, so bring it along.'}{' '}
                Everything else is provided.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/workshop" className="btn-clay text-center">
            Back to the workshop
          </Link>
          <Link href="/" className="btn-line text-center">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
