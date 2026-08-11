'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, RotateCcw, Box as BoxIcon } from 'lucide-react';
import type { ParamDef } from '@/lib/parametric/spec';
import type { Contour } from '@/lib/parametric/trace';
import ModelPreview from '@/components/ModelPreview';
import LogoField from '@/components/LogoField';

interface Props {
  slug: string;
  params: ParamDef[];
  notes: string[];
  printHint: string;
}

type Values = Record<string, number | boolean | string>;

function defaultsOf(params: ParamDef[]): Values {
  const out: Values = {};
  // A logo has no value to default — it arrives as geometry or not at all.
  for (const p of params) if (p.kind !== 'logo') out[p.key] = p.default;
  return out;
}

function toQuery(params: ParamDef[], values: Values): string {
  const qs = new URLSearchParams();
  for (const p of params) {
    if (p.kind === 'logo') continue;
    qs.set(p.key, String(values[p.key]));
  }
  return qs.toString();
}

function plainParams(params: ParamDef[], values: Values): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of params) {
    if (p.kind === 'logo') continue;
    out[p.key] = String(values[p.key]);
  }
  return out;
}

export default function ParametricStudio({ slug, params, notes, printHint }: Props) {
  const [values, setValues] = useState<Values>(() => defaultsOf(params));
  // The values the preview is actually built from. Dragging a slider updates
  // `values` immediately so the UI stays live, but only settles here once the
  // visitor stops — every render is CPU on a shared box.
  const [settled, setSettled] = useState<Values>(() => defaultsOf(params));

  const [mesh, setMesh] = useState<ArrayBuffer | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [logo, setLogo] = useState<Contour[] | null>(null);

  const logoParam = useMemo(() => params.find((p) => p.kind === 'logo'), [params]);
  // Artwork travels in a POST body, so it cannot be part of the query. This
  // stands in for it as a dependency: a new trace changes the point count and
  // the first coordinate, which is enough to know the preview is stale.
  const logoKey = useMemo(
    () => (logo ? `${logo.length}:${logo.reduce((n, c) => n + c.length, 0)}:${logo[0]?.[0] ?? ''}` : ''),
    [logo]
  );

  const query = useMemo(() => toQuery(params, settled), [params, settled]);
  const liveQuery = useMemo(() => toQuery(params, values), [params, values]);

  useEffect(() => {
    if (liveQuery === query) return;
    const timer = setTimeout(() => setSettled(values), 650);
    return () => clearTimeout(timer);
  }, [liveQuery, query, values]);

  // Fetch the preview mesh whenever the settled parameters change. An aborted
  // request is a superseded one, not an error worth showing.
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setBusy(true);
    const request = logoParam
      ? fetch(`/api/parametric/${slug}`, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            params: plainParams(params, settled),
            logo,
            preview: true,
          }),
        })
      : fetch(`/api/parametric/${slug}?${query}&preview=1`, { signal: controller.signal });

    request
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Could not build that combination.');
        }
        setSize(res.headers.get('X-Model-Size'));
        return res.arrayBuffer();
      })
      .then((buf) => {
        if (cancelled) return;
        setMesh(buf);
        setError(null);
      })
      .catch((err) => {
        if (cancelled || err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [slug, query, logoParam, logoKey, params, settled, logo]);

  const set = useCallback((key: string, value: number | boolean | string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function download(format: 'stl' | '3mf') {
    if (downloading) return;
    setDownloading(format);
    try {
      const res = logoParam
        ? await fetch(`/api/parametric/${slug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ params: plainParams(params, values), logo, format }),
          })
        : await fetch(`/api/parametric/${slug}?${toQuery(params, values)}&format=${format}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not build that one.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AppysStudio-${slug}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke on the next tick so Safari has picked the blob up first.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setDownloading(null);
    }
  }

  const changed = JSON.stringify(values) !== JSON.stringify(defaultsOf(params));

  return (
    <div className="grid lg:grid-cols-[1fr_minmax(0,22rem)] gap-6 items-start">
      {/* ---------------------------------------------------------- preview */}
      <div className="craft-card p-4 sm:p-5 order-1 lg:order-2 lg:sticky lg:top-24 w-full">
        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[color-mix(in_srgb,var(--color-paper)_60%,#000_4%)]">
          <ModelPreview stl={mesh} />
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-paper/45 backdrop-blur-[1px]">
              <Loader2 className="w-6 h-6 animate-spin text-clay" aria-hidden />
              <span className="sr-only">Building preview</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-3 text-sm">
          <span className="text-ink2">{size ? `${size} mm` : ' '}</span>
          <span className="text-ink2/70 text-xs">Drag to spin</span>
        </div>

        {error && (
          <p className="mt-3 text-sm text-clay-dark bg-clay/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => download('3mf')}
            disabled={downloading !== null}
            className="btn-clay justify-center disabled:opacity-60"
          >
            {downloading === '3mf' ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Download className="w-4 h-4" aria-hidden />
            )}
            Download .3mf
          </button>
          <button
            type="button"
            onClick={() => download('stl')}
            disabled={downloading !== null}
            className="btn-line justify-center disabled:opacity-60"
          >
            {downloading === 'stl' ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <BoxIcon className="w-4 h-4" aria-hidden />
            )}
            Download .stl
          </button>
        </div>

        <p className="mt-3 text-xs text-ink2/80 leading-relaxed">{printHint}</p>
      </div>

      {/* ------------------------------------------------------------ form */}
      <div className="craft-card p-5 sm:p-7 order-2 lg:order-1">
        <div className="flex items-baseline justify-between mb-5 gap-3">
          <h2 className="font-display text-xl">Set the numbers</h2>
          {changed && (
            <button
              type="button"
              onClick={() => setValues(defaultsOf(params))}
              className="text-xs text-ink2 hover:text-clay-dark inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" aria-hidden />
              Reset
            </button>
          )}
        </div>

        <div className="space-y-5">
          {logoParam && logoParam.kind === 'logo' && (
            <LogoField
              label={logoParam.label}
              help={logoParam.help}
              placeholder={logoParam.placeholder}
              value={logo}
              onChange={(contours) => setLogo(contours)}
            />
          )}
          {params.map((param) => (
            <Field key={param.key} param={param} value={values[param.key]} onChange={set} />
          ))}
        </div>

        {notes.length > 0 && (
          <div className="mt-7 pt-5 border-t border-ink/10 space-y-2">
            {notes.map((note) => (
              <p key={note} className="text-xs text-ink2 leading-relaxed">
                {note}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  param,
  value,
  onChange,
}: {
  param: ParamDef;
  value: number | boolean | string;
  onChange: (key: string, value: number | boolean | string) => void;
}) {
  const id = `p-${param.key}`;

  if (param.kind === 'logo') {
    return null;   // rendered separately: it owns state the value map cannot hold
  }

  if (param.kind === 'bool') {
    return (
      <div>
        <label htmlFor={id} className="flex items-center gap-3 cursor-pointer">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(param.key, e.target.checked)}
            className="w-4 h-4 accent-[var(--color-clay)]"
          />
          <span className="text-sm font-bold">{param.label}</span>
        </label>
        {param.help && <p className="mt-1 ml-7 text-xs text-ink2">{param.help}</p>}
      </div>
    );
  }

  if (param.kind === 'choice') {
    return (
      <div>
        <label htmlFor={id} className="block text-sm font-bold mb-1.5">
          {param.label}
        </label>
        <select
          id={id}
          value={String(value)}
          onChange={(e) => onChange(param.key, e.target.value)}
          className="craft-input w-full"
        >
          {param.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {param.help && <p className="mt-1 text-xs text-ink2">{param.help}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="text-sm font-bold">
          {param.label}
        </label>
        <span className="text-sm text-clay-dark tabular-nums font-bold">
          {value}
          {param.unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={Number(value)}
        onChange={(e) => onChange(param.key, Number(e.target.value))}
        className="w-full accent-[var(--color-clay)]"
      />
      {param.help && <p className="mt-1 text-xs text-ink2 leading-relaxed">{param.help}</p>}
    </div>
  );
}
