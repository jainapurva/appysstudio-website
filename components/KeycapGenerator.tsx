'use client';

import { useState } from 'react';
import { Download, Loader2, Type } from 'lucide-react';
import { MAX_NAME_LENGTH, NAME_PATTERN, sanitiseName } from '@/lib/keycaps/spec';

export default function KeycapGenerator() {
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const name = sanitiseName(raw);
  const tooLong = name.length > MAX_NAME_LENGTH;
  const badChars = name.length > 0 && !NAME_PATTERN.test(name);
  const ready = name.length > 0 && !tooLong && !badChars;

  const hint = tooLong
    ? `That is ${name.length} letters — the tray holds ${MAX_NAME_LENGTH}.`
    : badChars
      ? 'Letters A–Z only, for now.'
      : name.length >= 4
        ? `${name.length} keycaps on a ${name.length}-slot tray, “Our Hero” engraved underneath.`
        : name.length > 0
          ? `${name.length} keycap${name.length > 1 ? 's' : ''} on a ${name.length}-slot tray.`
          : 'Type a name to see what you get.';

  async function download() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(`/api/keycap?name=${encodeURIComponent(name)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not build that one.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AppysStudio-Keycaps-${name}.3mf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke on the next tick so Safari has picked the blob up first.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="craft-card p-6 sm:p-8">
      <label htmlFor="keycap-name" className="kicker !text-xs mb-4 block">
        Your name
      </label>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          id="keycap-name"
          className="craft-input flex-1 !text-2xl tracking-[0.2em] uppercase font-display"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && download()}
          placeholder="NYESHA"
          maxLength={MAX_NAME_LENGTH + 6}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="keycap-hint"
          aria-invalid={tooLong || badChars}
        />
        <button
          className="btn-clay whitespace-nowrap"
          onClick={download}
          disabled={!ready || busy}
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Building…
            </>
          ) : (
            <>
              <Download className="w-4 h-4" aria-hidden />
              Get the file
            </>
          )}
        </button>
      </div>

      <p
        id="keycap-hint"
        className={`mt-3 text-sm ${tooLong || badChars ? 'text-clay-dark' : 'text-ink2'}`}
        role={tooLong || badChars ? 'alert' : undefined}
      >
        {hint}
      </p>

      {/* Live preview of the keycaps themselves */}
      <div className="mt-7 min-h-[92px] flex flex-wrap items-center gap-2" aria-hidden>
        {name
          .slice(0, MAX_NAME_LENGTH)
          .split('')
          .map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-clay text-paper font-display text-2xl shadow-[0_4px_0_var(--color-clay-dark)] border border-clay-dark/40"
              style={{ transform: `rotate(${(i % 2 ? 1 : -1) * 2}deg)` }}
            >
              {ch}
            </span>
          ))}
        {name.length === 0 && (
          <span className="inline-flex items-center gap-2 text-ink2/70 font-serif-italic">
            <Type className="w-4 h-4" aria-hidden />
            your keycaps show up here
          </span>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-clay-dark border border-dashed border-clay/50 rounded-xl p-3" role="alert">
          {error}
        </p>
      )}
      {done && !error && (
        <p className="mt-4 text-sm text-sage-dark border border-dashed border-sage/50 rounded-xl p-3">
          Downloaded <b>{done}</b>. Open it in Bambu Studio, slice, and print —
          the keycaps need supports (already switched on in the file).
        </p>
      )}
    </div>
  );
}
