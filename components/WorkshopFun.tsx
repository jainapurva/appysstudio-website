'use client';

// The playful bits of /workshop/start: confetti, badges, and one mini-challenge
// per step. Each challenge calls onDone() once, which earns that step's badge.

import { useEffect, useState } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import {
  BADGES, SORT_GAME, SNAP_GAME, CAD_PUZZLE, PRINTER_TYPES, SNAP, LEARN_STEPS,
} from '@/lib/workshop-learn';

const card = 'bg-white rounded-xl p-4 shadow-[0_2px_0_rgba(61,47,36,.1)]';

// ------------------------------------------------------------------ confetti
const PIECES = ['🎉', '⭐', '✨', '🟧', '🟨', '🟩', '🟦', '🟪'];

// A pure pseudo-random number in [0, 1) so each burst looks different
// without calling Math.random() during render.
function noise(i: number, seed: number) {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Mount with a new `key` for each burst; it removes itself after the fall.
export function Confetti({ burst }: { burst: number }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, []);
  if (!burst || !visible) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden motion-reduce:hidden">
      <style>{`@keyframes wsfall { from { transform: translateY(-10vh) rotate(0deg); opacity: 1 } to { transform: translateY(110vh) rotate(540deg); opacity: .8 } }`}</style>
      {Array.from({ length: 36 }, (_, i) => (
        <span
          key={i}
          className="absolute top-0"
          style={{
            left: `${noise(i, burst) * 100}%`,
            fontSize: 14 + noise(i + 99, burst) * 14,
            animation: `wsfall ${1.6 + noise(i + 7, burst) * 1.2}s ease-in ${noise(i + 3, burst) * 0.4}s forwards`,
          }}
        >
          {PIECES[i % PIECES.length]}
        </span>
      ))}
    </div>
  );
}

// Mount with a new `key` for each burst, like Confetti.
export function BadgeToast({ stepId, burst }: { stepId: string; burst: number }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(t);
  }, []);
  const badge = BADGES[stepId];
  if (!burst || !show || !badge) return null;
  return (
    <div role="status" className="fixed top-24 right-4 z-50 bg-ink text-paper rounded-2xl px-5 py-4 shadow-xl flex items-center gap-3">
      <span className="text-4xl">{badge.emoji}</span>
      <span>
        <span className="block text-xs uppercase tracking-wide text-butter">New badge!</span>
        <span className="font-display text-xl">{badge.name}</span>
      </span>
    </div>
  );
}

export function BadgeShelf({ earned }: { earned: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink2 mb-2">Badges {earned.length}/{LEARN_STEPS.length}</p>
      <div className="flex flex-wrap gap-1">
        {LEARN_STEPS.map(s => {
          const b = BADGES[s.id];
          const got = earned.includes(s.id);
          return (
            <span
              key={s.id}
              title={got ? b.name : `Locked: ${b.how}`}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${got ? 'bg-butter' : 'bg-paper2 grayscale opacity-40'}`}
            >
              {b.emoji}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function FunFact({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <p className="rounded-xl bg-sage/15 border border-sage/30 p-4 text-ink">
      <span className="font-semibold text-sage-dark">💡 Did you know? </span>{text}
    </p>
  );
}

export function ChallengeHeader({ stepId, earned }: { stepId: string; earned: boolean }) {
  const b = BADGES[stepId];
  return (
    <p className="font-display text-xl text-ink flex items-center gap-2">
      <span className="text-2xl">{earned ? b.emoji : '🎯'}</span>
      {earned ? `You earned ${b.name}!` : `Challenge: ${b.how}`}
    </p>
  );
}

// ------------------------------------------------------- step 1: print layers
export function LayerDemo() {
  const [layer, setLayer] = useState(0.2);
  const [run, setRun] = useState(1);
  const height = 8; // a keycap is about 8 mm tall
  const layers = Math.round(height / layer);
  const colors = ['bg-clay', 'bg-craft-orange', 'bg-butter', 'bg-sage'];
  return (
    <div className={card}>
      <p className="font-semibold text-ink mb-1">Watch it print, one layer at a time</p>
      <p className="text-sm text-ink2 mb-3">Move the slider to change how thick each layer is.</p>
      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <div key={`${run}-${layer}`} className="w-40 h-48 flex flex-col-reverse items-center justify-start border-b-4 border-ink/70">
          <style>{`@keyframes wslayer { from { opacity: 0; transform: scaleX(.2) } to { opacity: 1; transform: scaleX(1) } }`}</style>
          {Array.from({ length: layers }, (_, i) => (
            <div
              key={i}
              className={`${colors[Math.floor(i / 4) % colors.length]} rounded-sm opacity-0 motion-reduce:opacity-100`}
              style={{
                width: `${70 - (i / layers) * 22}%`,
                height: `${180 / layers}px`,
                animation: `wslayer .12s ease-out ${i * (3 / layers)}s forwards`,
              }}
            />
          ))}
        </div>
        <div className="flex-1 w-full">
          <label className="text-sm font-semibold text-ink">Layer height: {layer.toFixed(2)} mm</label>
          <input type="range" min={0.1} max={0.4} step={0.02} value={layer}
            onChange={e => setLayer(Number(e.target.value))} className="w-full accent-clay" />
          <p className="font-display text-3xl text-clay mt-2">{layers} layers</p>
          <p className="text-sm text-ink2">for one 8 mm keycap. Thinner layers look smoother but take longer!</p>
          <button onClick={() => setRun(r => r + 1)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-clay">
            <RotateCcw className="w-4 h-4" /> Print it again
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------- step 1: sort it!
const WAYS = ['Additive', 'Subtractive', 'Formative'] as const;

export function SortGame({ onDone }: { onDone: () => void }) {
  const [picked, setPicked] = useState<Record<number, string>>({});
  const allRight = SORT_GAME.every((item, i) => picked[i] === item.answer);
  useEffect(() => { if (allRight) onDone(); }, [allRight, onDone]);
  return (
    <div className="space-y-2">
      {SORT_GAME.map((item, i) => (
        <div key={item.thing} className={`${card} flex flex-wrap items-center gap-2`}>
          <span className="flex-1 min-w-[12rem] text-ink font-semibold">{item.thing}</span>
          {WAYS.map(w => {
            const chosen = picked[i] === w;
            const right = w === item.answer;
            return (
              <button
                key={w}
                onClick={() => setPicked(p => ({ ...p, [i]: w }))}
                className={`px-3 py-1.5 rounded-full border-2 text-sm font-semibold ${
                  chosen ? (right ? 'bg-sage text-white border-sage' : 'bg-clay text-white border-clay animate-pulse') : 'bg-white border-ink2/20'
                }`}
              >
                {chosen && right ? '✓ ' : ''}{w}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------- step 2: mystery printers
export function MysteryPrinters({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState<boolean[]>(PRINTER_TYPES.map(() => false));
  useEffect(() => { if (open.every(Boolean)) onDone(); }, [open, onDone]);
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {PRINTER_TYPES.map((p, i) => (
        <button
          key={p.name}
          onClick={() => setOpen(o => o.map((v, j) => (j === i ? true : v)))}
          className={`text-left transition-colors rounded-xl p-4 shadow-[0_2px_0_rgba(61,47,36,.1)] ${open[i] ? 'bg-white' : 'bg-ink text-paper hover:bg-ink/90'}`}
        >
          {open[i] ? (
            <>
              <p className="font-display text-lg text-clay mb-1">{p.name}</p>
              <p className="text-sm text-ink2">{p.how}</p>
              <p className="text-sm text-ink2">Good for: {p.good}.</p>
              <p className="text-sm text-ink2">But: {p.bad}.</p>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-wide text-butter mb-1">Mystery printer #{i + 1}</p>
              <p className="font-display text-lg">&ldquo;It&apos;s like {p.like.toLowerCase()}.&rdquo;</p>
              <p className="text-sm text-foot-text mt-2">Guess it, then tap to reveal!</p>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------- step 5: puzzle
export function OneQuestion({ onDone }: { onDone: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const right = pick === CAD_PUZZLE.answer;
  useEffect(() => { if (right) onDone(); }, [right, onDone]);
  return (
    <div className={card}>
      <p className="font-semibold text-ink mb-2">{CAD_PUZZLE.q}</p>
      <div className="flex flex-col gap-2">
        {CAD_PUZZLE.options.map((o, i) => (
          <button
            key={o}
            onClick={() => setPick(i)}
            className={`text-left px-4 py-2 rounded-xl border-2 font-semibold ${
              pick === i ? (i === CAD_PUZZLE.answer ? 'bg-sage text-white border-sage' : 'bg-clay text-white border-clay') : 'bg-white border-ink2/20'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {pick !== null && <p className="text-sm text-ink2 mt-2">{right ? CAD_PUZZLE.why : 'Not quite. Think: how does it fit over the switch?'}</p>}
    </div>
  );
}

// ------------------------------------------------------ step 6: SNAP detective
export function SnapGame({ onDone }: { onDone: () => void }) {
  const [picked, setPicked] = useState<Record<number, string>>({});
  const allRight = SNAP_GAME.every((g, i) => picked[i] === g.missing);
  useEffect(() => { if (allRight) onDone(); }, [allRight, onDone]);
  return (
    <div className="space-y-3">
      {SNAP_GAME.map((g, i) => (
        <div key={g.prompt} className={card}>
          <p className="font-mono text-sm text-ink mb-2">&ldquo;{g.prompt}&rdquo;</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink2 mr-1">Missing:</span>
            {SNAP.map(s => {
              const chosen = picked[i] === s.letter;
              const right = s.letter === g.missing;
              return (
                <button
                  key={s.letter}
                  onClick={() => setPicked(p => ({ ...p, [i]: s.letter }))}
                  title={s.word}
                  className={`w-10 h-10 rounded-full border-2 font-display text-lg ${
                    chosen ? (right ? 'bg-sage text-white border-sage' : 'bg-clay text-white border-clay') : 'bg-white border-ink2/20'
                  }`}
                >
                  {s.letter}
                </button>
              );
            })}
          </div>
          {picked[i] === g.missing && <p className="text-sm text-ink2 mt-2">✓ {g.why}</p>}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------ step 9: certificate
export function Certificate({ earned }: { earned: string[] }) {
  const [name, setName] = useState('');
  useEffect(() => {
    try { setName(localStorage.getItem('workshop-maker-name') ?? ''); } catch { /* ignore */ }
  }, []);
  function save(v: string) {
    setName(v);
    try { localStorage.setItem('workshop-maker-name', v); } catch { /* ignore */ }
  }
  const date = new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <div className="space-y-3">
      <input
        value={name}
        onChange={e => save(e.target.value)}
        placeholder="Type your name for your certificate"
        className="w-full sm:w-80 rounded-xl border border-ink2/30 px-3 py-2 bg-white"
      />
      <div className="rounded-2xl border-4 border-double border-clay bg-white p-8 text-center shadow-[0_4px_0_rgba(61,47,36,.12)]">
        <p className="text-xs uppercase tracking-[0.3em] text-ink2">Appy&apos;s Studio</p>
        <p className="font-display text-4xl text-clay my-2 flex items-center justify-center gap-2">
          <Sparkles className="w-7 h-7" /> Certified Maker <Sparkles className="w-7 h-7" />
        </p>
        <p className="font-display text-3xl text-ink my-3 min-h-[2.5rem]">{name || 'Your Name'}</p>
        <p className="text-ink2">designed a 3D-printed clicker with AI, checked it like an engineer, and sent it to print.</p>
        <p className="text-4xl my-4 tracking-widest">{earned.map(id => BADGES[id]?.emoji).join(' ') || '🎯'}</p>
        <p className="text-sm text-ink2">{earned.length} of {LEARN_STEPS.length} badges · {date}</p>
      </div>
      <p className="text-sm text-ink2">Take a screenshot to keep it, or show it off to your family!</p>
    </div>
  );
}
