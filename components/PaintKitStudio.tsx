'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Upload, RotateCcw, Box as BoxIcon } from 'lucide-react';
import ModelPreview from '@/components/ModelPreview';
import {
  alphaOf,
  coverage,
  dilate,
  fillEnclosed,
  hasUsefulAlpha,
  largestComponent,
  luminance,
  pointCount,
  sobel,
  threshold,
  traceToMm,
  type Contour,
} from '@/lib/parametric/trace';

// Long edge the picture is resampled to before tracing. Big enough to keep the
// curve of a drawn line, small enough that tracing stays instant while a slider
// moves.
const WORK_SIZE = 420;

type Mode = 'lineart' | 'photo';

interface Traced {
  base: Contour[];
  lines: Contour[];
  points: number;
  /** Share of the picture the plate covers — a sanity check on the threshold. */
  fill: number;
}

export default function PaintKitStudio() {
  const [image, setImage] = useState<ImageData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('lineart');
  const [cut, setCut] = useState(128);
  const [lineWidth, setLineWidth] = useState(1.2);
  const [size, setSize] = useState(90);
  const [baseHeight, setBaseHeight] = useState(2.4);
  const [lineHeight, setLineHeight] = useState(0.8);
  const [smooth, setSmooth] = useState(1.2);

  const [traced, setTraced] = useState<Traced | null>(null);
  const [mesh, setMesh] = useState<ArrayBuffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flatCanvas = useRef<HTMLCanvasElement | null>(null);

  // ------------------------------------------------------------- load image
  const load = useCallback(async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('That is not an image.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = WORK_SIZE / Math.max(bitmap.width, bitmap.height);
      const w = Math.max(1, Math.round(bitmap.width * Math.min(1, scale)));
      const h = Math.max(1, Math.round(bitmap.height * Math.min(1, scale)));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('no canvas');
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();

      setImage(ctx.getImageData(0, 0, w, h));
      setFileName(file.name);
    } catch {
      setError('Could not read that image. Try a PNG or JPEG.');
    }
  }, []);

  // ------------------------------------------------------------------ trace
  useEffect(() => {
    if (!image) {
      setTraced(null);
      return;
    }

    const { width, height, data } = image;
    const count = width * height;
    const lum = luminance(data, count);
    const alpha = alphaOf(data, count);

    // Lines: dark strokes for a drawing, edges for a photograph.
    let lineMask =
      mode === 'lineart'
        ? threshold(lum, cut, true)
        : threshold(sobel(lum, width, height), Math.max(20, 255 - cut), false);

    // A one-pixel line is not printable; thicken to the requested width.
    const pxPerMm = Math.max(width, height) / size;
    const grow = Math.max(0, Math.round((lineWidth * pxPerMm) / 2) - 1);
    lineMask = dilate(lineMask, width, height, grow);

    // Plate: a supplied cut-out beats anything inferred from the pixels.
    const plate = hasUsefulAlpha(alpha)
      ? largestComponent(threshold(alpha, 128, false), width, height)
      : largestComponent(fillEnclosed(lineMask, width, height), width, height);

    const options = { sizeMm: size, tolerance: smooth, minSpan: 2 };
    const base = traceToMm(plate, width, height, options);
    // The outline is only wanted where the plate actually is.
    const linesOnPlate = new Uint8Array(count);
    for (let i = 0; i < count; i++) linesOnPlate[i] = lineMask[i] && plate[i] ? 1 : 0;
    const lines = traceToMm(linesOnPlate, width, height, options);

    setTraced({ base, lines, points: pointCount(base) + pointCount(lines), fill: coverage(plate) });
  }, [image, mode, cut, lineWidth, size, smooth]);

  // ------------------------------------------------------- draw flat preview
  useEffect(() => {
    const canvas = flatCanvas.current;
    if (!canvas || !traced) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const half = size / 2;
    const scale = (Math.min(width, height) * 0.92) / size;
    const toCanvas = ([x, y]: [number, number]): [number, number] => [
      width / 2 + x * scale,
      height / 2 - y * scale,
    ];

    const path = (contours: Contour[]) => {
      ctx.beginPath();
      for (const contour of contours) {
        contour.forEach((point, i) => {
          const [cx, cy] = toCanvas(point);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        });
        ctx.closePath();
      }
    };

    ctx.fillStyle = '#fdfaf3';
    path(traced.base);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(61,47,36,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#3d2f24';
    path(traced.lines);
    ctx.fill('evenodd');

    void half;
  }, [traced, size]);

  // ------------------------------------------------------------ build model
  const build = useCallback(
    async (format: 'stl' | '3mf', forPreview: boolean) => {
      if (!traced || traced.base.length === 0) return null;
      const res = await fetch('/api/paint-kit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base: traced.base,
          lines: traced.lines,
          baseHeight,
          lineHeight,
          format: forPreview ? 'stl' : format,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not build that one.');
      }
      return res;
    },
    [traced, baseHeight, lineHeight]
  );

  // Preview settles after edits stop, so dragging a slider is not one render
  // per pixel of travel.
  useEffect(() => {
    if (!traced || traced.base.length === 0) {
      setMesh(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await build('stl', true);
        if (!res || cancelled) return;
        setMesh(await res.arrayBuffer());
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [traced, baseHeight, lineHeight, build]);

  async function download(format: 'stl' | '3mf') {
    if (downloading) return;
    setDownloading(format);
    try {
      const res = await build(format, false);
      if (!res) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AppysStudio-paint-kit.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setDownloading(null);
    }
  }

  // A plate covering almost nothing means the outline had a gap and the fill
  // leaked out through it — worth saying, because the fix is a nudge away.
  const leaked = traced !== null && traced.base.length > 0 && traced.fill < 0.06;
  const ready = traced !== null && traced.base.length > 0;

  if (!image) {
    return <Dropzone onFile={load} error={error} />;
  }

  return (
    <div className="grid lg:grid-cols-[1fr_minmax(0,22rem)] gap-6 items-start">
      {/* ------------------------------------------------------- previews */}
      <div className="craft-card p-4 sm:p-5 order-1 lg:order-2 lg:sticky lg:top-24">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-[color-mix(in_srgb,var(--color-paper)_60%,#000_4%)]">
          <ModelPreview stl={mesh} />
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-paper/45 backdrop-blur-[1px]">
              <Loader2 className="w-6 h-6 animate-spin text-clay" aria-hidden />
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-ink2">
          {traced ? `${traced.points.toLocaleString()} points traced` : ' '}
        </p>

        {error && (
          <p className="mt-3 text-sm text-clay-dark bg-clay/10 rounded-lg px-3 py-2">{error}</p>
        )}
        {leaked && (
          <p className="mt-3 text-sm text-clay-dark bg-butter/40 rounded-lg px-3 py-2">
            Barely any plate came out — the outline probably has a gap in it, so the fill
            escaped. Nudge the threshold, or thicken the line.
          </p>
        )}

        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => download('3mf')}
            disabled={!ready || downloading !== null}
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
            disabled={!ready || downloading !== null}
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

        <p className="mt-3 text-xs text-ink2/80 leading-relaxed">
          The .3mf carries the plate and the outline as two objects — assign a colour to each
          and print it in two. The .stl is one piece, for a filament change instead.
        </p>
      </div>

      {/* ----------------------------------------------------------- form */}
      <div className="craft-card p-5 sm:p-7 order-2 lg:order-1">
        <div className="flex items-baseline justify-between mb-5 gap-3">
          <h2 className="font-display text-xl">Trace it</h2>
          <button
            type="button"
            onClick={() => {
              setImage(null);
              setFileName(null);
              setMesh(null);
            }}
            className="text-xs text-ink2 hover:text-clay-dark inline-flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" aria-hidden />
            New picture
          </button>
        </div>

        {fileName && <p className="text-xs text-ink2 mb-4 truncate">{fileName}</p>}

        <canvas
          ref={flatCanvas}
          width={520}
          height={340}
          className="w-full rounded-xl border border-ink/10 bg-paper mb-6"
        />

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-1.5">What kind of picture?</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="craft-input w-full"
            >
              <option value="lineart">Drawing or colouring page — trace the dark lines</option>
              <option value="photo">Photo — find the edges</option>
            </select>
          </div>

          <Slider
            label={mode === 'lineart' ? 'Line threshold' : 'Edge sensitivity'}
            value={cut}
            min={30}
            max={230}
            step={2}
            onChange={setCut}
            help={
              mode === 'lineart'
                ? 'How dark a pixel has to be to count as a line.'
                : 'Higher picks up more detail, and more noise with it.'
            }
          />
          <Slider label="Line width" unit="mm" value={lineWidth} min={0.4} max={4} step={0.1} onChange={setLineWidth} help="Thin lines look sharp but need a fine nozzle." />
          <Slider label="Plaque size" unit="mm" value={size} min={40} max={200} step={5} onChange={setSize} />
          <Slider label="Plate thickness" unit="mm" value={baseHeight} min={1} max={6} step={0.2} onChange={setBaseHeight} />
          <Slider label="Line height" unit="mm" value={lineHeight} min={0.2} max={2} step={0.1} onChange={setLineHeight} help="How far the outline stands proud of the plate." />
          <Slider label="Smoothing" value={smooth} min={0.2} max={4} step={0.1} onChange={setSmooth} help="Higher rounds off the traced outline and makes a lighter file." />
        </div>

        <div className="mt-7 pt-5 border-t border-ink/10 space-y-2">
          <p className="text-xs text-ink2 leading-relaxed">
            Prints flat with no supports. Matte white or light PLA takes acrylic paint and
            paint markers straight off the plate — no primer.
          </p>
          <p className="text-xs text-ink2 leading-relaxed">
            Line drawings with a closed outer outline work best. A picture with a transparent
            background is used as the plate shape directly.
          </p>
        </div>
      </div>
    </div>
  );
}

function Dropzone({ onFile, error }: { onFile: (file: File) => void; error: string | null }) {
  const [over, setOver] = useState(false);

  return (
    <div className="max-w-2xl">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={`craft-card flex flex-col items-center justify-center text-center px-6 py-16 cursor-pointer transition-colors ${
          over ? 'bg-butter/30' : ''
        }`}
      >
        <Upload className="w-8 h-8 text-clay mb-4" aria-hidden />
        <span className="font-display text-xl mb-2">Drop a picture in</span>
        <span className="text-sm text-ink2 max-w-sm">
          A drawing, a logo, a photo of a pet. It is traced in your browser — the picture
          itself never leaves your computer.
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>
      {error && <p className="mt-4 text-sm text-clay-dark">{error}</p>}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  help,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  help?: string;
  onChange: (value: number) => void;
}) {
  const id = `pk-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="text-sm font-bold">
          {label}
        </label>
        <span className="text-sm text-clay-dark tabular-nums font-bold">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-clay)]"
      />
      {help && <p className="mt-1 text-xs text-ink2 leading-relaxed">{help}</p>}
    </div>
  );
}
