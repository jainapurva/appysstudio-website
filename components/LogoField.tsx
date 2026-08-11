'use client';

/**
 * Turn an uploaded logo into contours, entirely in the browser.
 *
 * The picture is never uploaded. A canvas decodes it here, trace.ts turns the
 * pixels into outlines, and only a few hundred coordinates are sent on. That
 * keeps image decoding off a shared server and means a visitor's artwork does
 * not leave their machine.
 *
 * SVG and PNG both arrive the same way: the browser rasterises either into the
 * canvas. An SVG is drawn at a high enough resolution that tracing it back is
 * lossless at print scale — a 22mm logo at a 0.4mm nozzle cannot resolve
 * anything a 1024px trace would miss.
 */

import { useCallback, useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import {
  alphaOf,
  hasUsefulAlpha,
  luminance,
  threshold,
  traceToMm,
  pointCount,
  type Contour,
} from '@/lib/parametric/trace';

const RASTER = 1024; // px on the longest side before tracing
const SIZE_MM = 100; // arbitrary; the model rescales to the chosen logo size
const MAX_FILE = 8 * 1024 * 1024;

interface Props {
  label: string;
  help?: string;
  placeholder?: string;
  value: Contour[] | null;
  onChange: (contours: Contour[] | null, name: string | null) => void;
}

async function decode(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('That file could not be read as an image.'));
      img.src = url;
    });
    return img;
  } finally {
    // Revoking immediately would race the decode on some browsers; one tick is
    // enough, and the blob is small.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export function traceImage(img: HTMLImageElement, cut: number): Contour[] {
  // An SVG with no intrinsic size reports 0; fall back to a square.
  const iw = img.naturalWidth || 512;
  const ih = img.naturalHeight || 512;
  const scale = RASTER / Math.max(iw, ih);
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Your browser would not give us a canvas.');
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);
  const count = w * h;

  // A logo usually arrives cut out (SVG, or a PNG with transparency). When it
  // does the alpha channel IS the shape, and thresholding luminance would
  // instead pick up whatever the transparent pixels happen to hold.
  const alpha = alphaOf(data, count);
  const mask = hasUsefulAlpha(alpha)
    ? threshold(alpha, 128, false)
    : threshold(luminance(data, count), cut, true);

  return traceToMm(mask, w, h, { sizeMm: SIZE_MM, tolerance: 0.75, minSpan: 3 });
}

export default function LogoField({ label, help, placeholder, value, onChange }: Props) {
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cut, setCut] = useState(128);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const run = useCallback(
    (img: HTMLImageElement, at: number, fileName: string) => {
      const contours = traceImage(img, at);
      if (contours.length === 0) {
        setError('Nothing came out of that — try the threshold slider.');
        onChange(null, null);
        return;
      }
      setError(null);
      onChange(contours, fileName);
    },
    [onChange]
  );

  const load = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE) {
        setError('That file is over 8MB. A logo needs far less.');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const img = await decode(file);
        imageRef.current = img;
        setName(file.name);
        run(img, cut, file.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read that file.');
        onChange(null, null);
      } finally {
        setBusy(false);
      }
    },
    [cut, run, onChange]
  );

  const clear = () => {
    imageRef.current = null;
    setName(null);
    setError(null);
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const points = value ? pointCount(value) : 0;

  return (
    <div>
      <label className="text-sm font-bold block mb-1.5">{label}</label>

      {!name && (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-ink2/30 rounded-lg py-6 px-4 cursor-pointer hover:border-clay transition-colors text-center">
          <Upload className="w-5 h-5 text-ink2" aria-hidden />
          <span className="text-sm text-ink2">
            {placeholder ?? 'Choose an SVG or PNG'}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void load(file);
            }}
          />
        </label>
      )}

      {name && (
        <div className="flex items-center gap-2 text-sm">
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <span className="w-2 h-2 rounded-full bg-clay" aria-hidden />
          )}
          <span className="truncate flex-1">{name}</span>
          <span className="text-xs text-ink2 tabular-nums">{points} pts</span>
          <button
            type="button"
            onClick={clear}
            className="p-1 hover:text-clay"
            aria-label="Remove logo"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
      )}

      {name && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-xs font-bold">Threshold</span>
            <span className="text-xs text-clay-dark tabular-nums font-bold">{cut}</span>
          </div>
          <input
            type="range"
            min={16}
            max={240}
            step={4}
            value={cut}
            onChange={(e) => {
              const next = Number(e.target.value);
              setCut(next);
              if (imageRef.current) run(imageRef.current, next, name);
            }}
            className="w-full accent-[var(--color-clay)]"
          />
          <p className="mt-1 text-xs text-ink2">
            Only used for logos without a transparent background.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {help && !error && <p className="mt-1 text-xs text-ink2 leading-relaxed">{help}</p>}
    </div>
  );
}
