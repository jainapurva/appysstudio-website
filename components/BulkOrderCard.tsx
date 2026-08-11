'use client';

import { useRef, useState } from 'react';
import { Check, Loader2, Send, Upload, X } from 'lucide-react';

interface Props {
  /** Model this order is for — goes in the request so it needs no interpreting. */
  modelName: string;
  unitPrice: number;
  minQuantity: number;
  includes: string[];
}

/**
 * The paid path beside the free download: we print them, you get a box.
 *
 * This submits a request rather than taking payment. A run of these needs two
 * colours agreed and a logo checked for strokes too thin to print, and none of
 * that survives being guessed at checkout — so the quantity and the total are
 * fixed here, and the invoice follows once the details are settled.
 */
export default function BulkOrderCard({ modelName, unitPrice, minQuantity, includes }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [quantity, setQuantity] = useState(minQuantity);
  const [logo, setLogo] = useState<File | null>(null);
  const [form, setForm] = useState({ name: '', email: '', company: '', colours: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const total = quantity * unitPrice;

  // Typing in the box is allowed to go below the minimum — clamping mid-keystroke
  // makes the field impossible to edit — so the floor is enforced on the way out.
  const commitQuantity = (value: number) =>
    setQuantity(Number.isFinite(value) ? Math.max(minQuantity, Math.round(value)) : minQuantity);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const body = new FormData();
    body.set('name', form.name);
    body.set('email', form.email);
    body.set('material', 'PLA');
    body.set('color', form.colours || 'to be confirmed');
    body.set('quantity', String(Math.max(minQuantity, quantity)));
    body.set(
      'notes',
      [
        `${modelName} — bulk order`,
        `${quantity} × $${unitPrice.toFixed(2)} = $${total.toFixed(2)}`,
        form.company && `Company: ${form.company}`,
        form.colours && `Colours: ${form.colours}`,
        form.notes,
      ]
        .filter(Boolean)
        .join('\n')
    );
    if (logo) {
      body.set('file', logo);
      body.set('fileName', logo.name);
    }

    try {
      const res = await fetch('/api/quote', { method: 'POST', body });
      if (!res.ok) throw new Error('That did not go through.');
      setSent(true);
    } catch {
      setError('That did not go through. Email apurva@appysstudio.com and I will pick it up.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <section className="mt-14 bg-white rounded-3xl p-8 shadow-[0_3px_0_rgba(61,47,36,.12),0_10px_24px_rgba(61,47,36,.08)]">
        <div className="flex items-center gap-3 text-sage">
          <Check className="w-6 h-6" />
          <h2 className="font-display text-[24px] text-ink">Got it.</h2>
        </div>
        <p className="text-ink2 mt-3 max-w-xl">
          {quantity} {modelName.toLowerCase()}s, ${total.toFixed(2)}. I will come back with colours
          confirmed, a look at how your logo prints at this size, and an invoice.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-14 bg-white rounded-3xl p-8 shadow-[0_3px_0_rgba(61,47,36,.12),0_10px_24px_rgba(61,47,36,.08)]">
      <p className="kicker mb-2">Or have us make them</p>
      <h2 className="font-display text-[26px] text-ink">Printed, assembled, boxed</h2>
      <p className="text-ink2 mt-2 max-w-xl">
        The file above is yours for nothing. If you would rather not run 25 prints yourself, we will
        — ${unitPrice.toFixed(2)} each, minimum {minQuantity}.
      </p>

      <ul className="mt-5 space-y-2">
        {includes.map((line) => (
          <li key={line} className="flex gap-2.5 text-sm text-ink2">
            <Check className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
            {line}
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-ink sm:col-span-2">
          How many
          <div className="mt-1.5 flex items-center gap-3">
            {/* craft-input is full-width, so the box is sized by its wrapper. */}
            <div className="w-24 flex-shrink-0">
              <input
                type="number"
                min={minQuantity}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                onBlur={(e) => commitQuantity(Number(e.target.value))}
                className="craft-input text-sm"
              />
            </div>
            <span className="text-ink2 font-normal">
              × ${unitPrice.toFixed(2)} ={' '}
              <span className="font-display text-lg text-clay">${total.toFixed(2)}</span>
            </span>
          </div>
          <span className="block mt-1 text-[11px] font-normal text-ink2/70">
            Minimum {minQuantity} — below that the setup costs more than the parts.
          </span>
        </label>

        <label className="text-sm font-semibold text-ink">
          Your name
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="craft-input text-sm mt-1.5"
          />
        </label>

        <label className="text-sm font-semibold text-ink">
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="craft-input text-sm mt-1.5"
          />
        </label>

        <label className="text-sm font-semibold text-ink">
          Company <span className="font-normal text-ink2/70">(optional)</span>
          <input
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            className="craft-input text-sm mt-1.5"
          />
        </label>

        <label className="text-sm font-semibold text-ink">
          Colours
          <input
            placeholder="e.g. black cap, orange logo"
            value={form.colours}
            onChange={(e) => setForm((f) => ({ ...f, colours: e.target.value }))}
            className="craft-input text-sm mt-1.5"
          />
        </label>

        <label className="text-sm font-semibold text-ink sm:col-span-2">
          Anything else <span className="font-normal text-ink2/70">(optional)</span>
          <textarea
            rows={3}
            placeholder="Deadline, event, where they are going…"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="craft-input text-sm mt-1.5 resize-none"
          />
        </label>

        <div className="sm:col-span-2">
          {logo ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-ink truncate">{logo.name}</span>
              <button
                type="button"
                onClick={() => {
                  setLogo(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="p-1 text-ink2/70 hover:text-[#b3402a] transition-colors"
                aria-label="Remove logo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="text-sm text-clay hover:text-clay-dark font-bold flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" /> Attach your logo (SVG or PNG)
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".svg,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setLogo(file);
            }}
          />
        </div>

        {error && <p className="sm:col-span-2 text-sm text-[#b3402a]">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-clay sm:col-span-2">
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" /> Request {quantity} — ${total.toFixed(2)}
            </>
          )}
        </button>
      </form>
    </section>
  );
}
