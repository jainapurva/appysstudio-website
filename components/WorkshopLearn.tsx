'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Download, ExternalLink, ShieldAlert, XCircle } from 'lucide-react';
import {
  LEARN_STEPS, SAFETY_RULES, MAKE_THREE_WAYS, PRINT_JOURNEY, FILAMENTS,
  FILAMENT_QUIZ, SNAP, PROMPT_LEVELS, AI_CHECKLIST, AFTER_PRINT,
  BAMBU_STUDIO_URL, BAMBU_STUDIO_RELEASES_URL, SLICER_JOBS, SLICER_INSTALL, FUN_FACTS, BADGES,
} from '@/lib/workshop-learn';
import WorkshopDesigner from '@/components/WorkshopDesigner';
import {
  Confetti, BadgeToast, BadgeShelf, FunFact, ChallengeHeader, LayerDemo, SortGame,
  MysteryPrinters, OneQuestion, SnapGame, Certificate,
} from '@/components/WorkshopFun';

const STEP_KEY = 'workshop-learn-step';
const BADGE_KEY = 'workshop-badges';

const card = 'bg-white rounded-xl p-4 shadow-[0_2px_0_rgba(61,47,36,.1)]';

function Cards({ items }: { items: { title: string; lines: string[] }[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map(i => (
        <div key={i.title} className={card}>
          <p className="font-display text-lg text-ink mb-1">{i.title}</p>
          {i.lines.map(l => <p key={l} className="text-sm text-ink2">{l}</p>)}
        </div>
      ))}
    </div>
  );
}

function Quiz({ onDone }: { onDone: () => void }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const score = FILAMENT_QUIZ.filter((q, i) => picked[i] === q.answer).length;
  const finished = Object.keys(picked).length === FILAMENT_QUIZ.length;
  useEffect(() => { if (finished) onDone(); }, [finished, onDone]);
  return (
    <div className="space-y-4">
      {FILAMENT_QUIZ.map((q, i) => (
        <div key={q.q} className={card}>
          <p className="font-semibold text-ink mb-2">{i + 1}. {q.q}</p>
          <div className="flex flex-wrap gap-2">
            {q.options.map((o, j) => {
              const chosen = picked[i] === j;
              const right = j === q.answer;
              return (
                <button
                  key={o}
                  onClick={() => setPicked(p => ({ ...p, [i]: j }))}
                  className={`px-3 py-1.5 rounded-full border-2 text-sm font-semibold ${
                    chosen ? (right ? 'bg-sage text-white border-sage' : 'bg-clay text-white border-clay') : 'bg-white border-ink2/20'
                  }`}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {picked[i] !== undefined && (
            <p className="text-sm mt-2 flex items-start gap-1 text-ink2">
              {picked[i] === q.answer ? <CheckCircle2 className="w-4 h-4 text-sage mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-clay mt-0.5 shrink-0" />}
              {q.why}
            </p>
          )}
        </div>
      ))}
      {Object.keys(picked).length === FILAMENT_QUIZ.length && (
        <p className="font-display text-xl text-clay">You got {score} out of {FILAMENT_QUIZ.length}!{score === FILAMENT_QUIZ.length ? ' Perfect score! 🏆' : ' Try the ones you missed again!'}</p>
      )}
    </div>
  );
}

function Checklist({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState<boolean[]>(AI_CHECKLIST.map(() => false));
  const all = done.every(Boolean);
  useEffect(() => { if (all) onDone(); }, [all, onDone]);
  return (
    <div className="space-y-2">
      {AI_CHECKLIST.map((c, i) => (
        <button
          key={c}
          onClick={() => setDone(d => d.map((v, j) => (j === i ? !v : v)))}
          className={`${card} w-full text-left flex items-start gap-3`}
        >
          {done[i] ? <CheckCircle2 className="w-6 h-6 text-sage shrink-0" /> : <Circle className="w-6 h-6 text-ink2/40 shrink-0" />}
          <span className="text-ink">{c}</span>
        </button>
      ))}
      {done.every(Boolean) && (
        <p className="font-display text-xl text-sage-dark pt-2">Great engineering! Your design passed every check.</p>
      )}
    </div>
  );
}

interface StepProps {
  id: string;
  earned: string[];
  earn: (id: string) => void;
}

function StepBody({ id, earned, earn }: StepProps) {
  const done = useCallback(() => earn(id), [earn, id]);
  const got = earned.includes(id);
  switch (id) {
    case 'what':
      return (
        <div className="space-y-5">
          <p className="text-lg text-ink">
            Welcome, maker! Today you&apos;ll learn how 3D printing works, then design your own <b>clicker keychain</b> with
            an AI, check its work like an engineer, print it, and build it. It&apos;s yours to take home.
          </p>
          <div className={`${card} border-l-4 border-clay`}>
            <p className="font-semibold text-ink flex items-center gap-2 mb-2"><ShieldAlert className="w-5 h-5 text-clay" /> Safety first</p>
            <ul className="space-y-1">
              {SAFETY_RULES.map(r => <li key={r} className="text-ink2">• {r}</li>)}
            </ul>
          </div>
          <p className="text-lg text-ink">So what is it? A 3D printer builds a real object from a computer file, <b>one thin layer at a time</b>, from the bottom up.</p>
          <h3 className="font-display text-xl text-ink">Three ways to make things</h3>
          <Cards items={MAKE_THREE_WAYS.map(w => ({ title: w.name, lines: [w.how, w.example] }))} />
          <h3 className="font-display text-xl text-ink">From idea to object in 4 steps</h3>
          <ol className="grid sm:grid-cols-4 gap-3">
            {PRINT_JOURNEY.map((s, i) => (
              <li key={s.name} className={card}>
                <p className="text-clay font-display text-2xl">{i + 1}</p>
                <p className="font-semibold text-ink">{s.name}</p>
                <p className="text-sm text-ink2">{s.what}</p>
              </li>
            ))}
          </ol>
          <LayerDemo />
          <ChallengeHeader stepId={id} earned={got} />
          <p className="text-ink2 -mt-3">Is each one additive, subtractive or formative?</p>
          <SortGame onDone={done} />
          <FunFact text={FUN_FACTS[id]} />
        </div>
      );
    case 'printers':
      return (
        <div className="space-y-5">
          <p className="text-lg text-ink">There&apos;s more than one way to 3D print. Can you guess each printer from its clue?</p>
          <ChallengeHeader stepId={id} earned={got} />
          <MysteryPrinters onDone={done} />
          <p className="bg-butter/60 rounded-xl p-4 text-ink">
            <b>Look at our printers:</b> on the A1 the <b>bed slides</b> back and forth. On the P1S the
            <b> head zips around</b> and the bed moves down. Which part moves on each one?
          </p>
          <FunFact text={FUN_FACTS[id]} />
        </div>
      );
    case 'filaments':
      return (
        <div className="space-y-5">
          <p className="text-lg text-ink">FDM printers use <b>filament</b>: plastic string on a spool, 1.75 mm thick.</p>
          <Cards items={FILAMENTS.map(f => ({ title: f.name, lines: [f.feel, `Used for: ${f.where}.`, f.note + '.'] }))} />
          <ChallengeHeader stepId={id} earned={got} />
          <Quiz onDone={done} />
          <FunFact text={FUN_FACTS[id]} />
        </div>
      );
    case 'slicer':
      return (
        <div className="space-y-5">
          <p className="text-lg text-ink">
            A printer can&apos;t read a 3D model directly. First a <b>slicer</b> turns it into instructions. Ours is
            <b> Bambu Studio</b>: it&apos;s free, and it&apos;s what we use at the print station.
          </p>
          <div className={card}>
            <p className="font-semibold text-ink mb-2">What a slicer does</p>
            <ul className="space-y-1">
              {SLICER_JOBS.map(j => <li key={j} className="text-ink2">• {j}</li>)}
            </ul>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href={BAMBU_STUDIO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-clay hover:bg-clay-dark text-white font-semibold px-5 py-3 rounded-xl">
              <Download className="w-5 h-5" /> Download Bambu Studio
            </a>
            <a href={BAMBU_STUDIO_RELEASES_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-ink2 underline">
              Page won&apos;t load? Get it from GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-sm text-ink2">Works on Windows 10 (64-bit) or newer and macOS 10.15 or newer. Not on Chromebooks or iPads: if that&apos;s your device, share with a buddy or use the print station.</p>
          <ol className="grid sm:grid-cols-4 gap-3">
            {SLICER_INSTALL.map((s, i) => (
              <li key={s.name} className={card}>
                <p className="text-clay font-display text-2xl">{i + 1}</p>
                <p className="font-semibold text-ink">{s.name}</p>
                <p className="text-sm text-ink2">{s.what}</p>
              </li>
            ))}
          </ol>
          <ChallengeHeader stepId={id} earned={got} />
          {!got && (
            <button onClick={done} className="inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-white font-semibold px-5 py-3 rounded-xl">
              ✅ I have Bambu Studio open!
            </button>
          )}
          <FunFact text={FUN_FACTS[id]} />
        </div>
      );
    case 'cad':
      return (
        <div className="space-y-5">
          <p className="text-lg text-ink"><b>CAD</b> means Computer-Aided Design: drawing a 3D object on a computer with exact sizes.</p>
          <Cards items={[
            { title: 'Solids and holes', lines: ['Every CAD design is shapes added together and shapes cut away.', 'A keycap = a box, minus a smaller box inside (so it\'s hollow), minus a plus-shaped hole.'] },
            { title: 'Code is a recipe', lines: ['CAD can be written as words, like a recipe.', 'difference() { cube(17); cylinder(d = 5, h = 20); } means "a block, with a hole through it".'] },
            { title: 'Numbers are the design', lines: ['Change width = 17 to width = 20 and the whole thing grows.', 'That\'s why we ask the AI to put every number at the top.'] },
            { title: 'Parametric = a recipe with blanks', lines: ['Fill in the blanks and the computer builds a new version.', 'Our clicker generator builds a clicker for any name.'] },
          ]} />
          <Link href="/3d-generator/parametric/keycaps" target="_blank" className="inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-white font-semibold px-4 py-2 rounded-xl">
            Try it: type your name into the clicker generator <ArrowRight className="w-4 h-4" />
          </Link>
          <ChallengeHeader stepId={id} earned={got} />
          <OneQuestion onDone={done} />
          <FunFact text={FUN_FACTS[id]} />
        </div>
      );
    case 'snap':
      return (
        <div className="space-y-5">
          <p className="text-lg text-ink">The AI can&apos;t see your switch, your hand or the printer. You have to tell it everything. Make your prompt <b>SNAP</b>:</p>
          <div className="grid sm:grid-cols-4 gap-3">
            {SNAP.map(s => (
              <div key={s.letter} className={card}>
                <p className="font-display text-4xl text-clay">{s.letter}</p>
                <p className="font-semibold text-ink">{s.word}</p>
                <p className="text-sm text-ink2">{s.say}</p>
                <p className="text-sm text-ink2 italic mt-1">{s.example}</p>
              </div>
            ))}
          </div>
          <p className="text-ink">And always finish with: <i>&quot;Put every size in a variable at the top with a short comment.&quot;</i></p>
          <h3 className="font-display text-xl text-ink">Why details matter</h3>
          <div className="space-y-3">
            {PROMPT_LEVELS.map(l => (
              <div key={l.level} className={card}>
                <p className="text-sm font-semibold text-clay">Level {l.level}</p>
                <p className="text-ink font-mono text-sm my-1">{l.prompt}</p>
                <p className="text-sm text-ink2">→ {l.result}</p>
              </div>
            ))}
          </div>
          <ChallengeHeader stepId={id} earned={got} />
          <p className="text-ink2 -mt-3">Be a prompt detective: which SNAP letter is each prompt missing?</p>
          <SnapGame onDone={done} />
          <FunFact text={FUN_FACTS[id]} />
        </div>
      );
    case 'design':
      return (
        <div className="space-y-6">
          <ChallengeHeader stepId={id} earned={got} />
          <WorkshopDesigner onDesigned={done} onSent={() => earn('print')} />
          <FunFact text={FUN_FACTS[id]} />
        </div>
      );
    case 'check':
      return (
        <div className="space-y-4">
          <p className="text-lg text-ink">AI is fast, but it isn&apos;t always right. Engineers check every design before it prints. Tick each one off:</p>
          <ChallengeHeader stepId={id} earned={got} />
          <Checklist onDone={done} />
          <p className="text-ink2">Found a problem? Go back to <b>Design with AI</b> and ask Claude to fix it, or change the number yourself.</p>
          <FunFact text={FUN_FACTS[id]} />
        </div>
      );
    case 'print':
      return (
        <div className="space-y-5">
          <p className="text-lg text-ink">When your design passes the checks, press <b>Send to the print station</b> on the Design step. Here&apos;s what happens next:</p>
          <ol className="grid sm:grid-cols-4 gap-3">
            {AFTER_PRINT.map((s, i) => (
              <li key={s.name} className={card}>
                <p className="text-clay font-display text-2xl">{i + 1}</p>
                <p className="font-semibold text-ink">{s.name}</p>
                <p className="text-sm text-ink2">{s.what}</p>
              </li>
            ))}
          </ol>
          <div className={card}>
            <p className="font-semibold text-ink mb-1">Slice it yourself in Bambu Studio</p>
            <p className="text-sm text-ink2">
              On the Design step press <b>Open big</b>, then <b>Render</b>, then <b>Download STL</b>. Drag the file into
              Bambu Studio and press <b>Slice plate</b>. Slide through the layers and read how long it would take to print.
            </p>
          </div>
          <p className="bg-butter/60 rounded-xl p-4 text-ink">
            <b>Keep making at home:</b> this page stays open for you at appysstudio.com/workshop/start, and our
            free generators are at <Link href="/3d-generator" className="underline">appysstudio.com/3d-generator</Link>.
          </p>
          <FunFact text={FUN_FACTS[id]} />
          <h3 className="font-display text-2xl text-ink">🎓 Your Maker certificate</h3>
          <Certificate earned={earned} />
        </div>
      );
    default:
      return null;
  }
}

export default function WorkshopLearn() {
  const [index, setIndex] = useState(0);
  const [earned, setEarned] = useState<string[]>([]);
  const earnedRef = useRef<string[]>([]);
  const [burst, setBurst] = useState({ id: '', n: 0 });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(BADGE_KEY) ?? '[]');
      if (Array.isArray(saved)) {
        const valid = saved.filter((b): b is string => typeof b === 'string' && b in BADGES);
        earnedRef.current = valid;
        setEarned(valid);
      }
    } catch { /* ignore */ }
  }, []);

  // Earning is idempotent: challenges may call this on every render once done.
  const earn = useCallback((id: string) => {
    if (earnedRef.current.includes(id)) return;
    const next = [...earnedRef.current, id];
    earnedRef.current = next;
    setEarned(next);
    setBurst(b => ({ id, n: b.n + 1 }));
    try { localStorage.setItem(BADGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // ?step=design lets the instructor send everyone to one step.
    const wanted = new URLSearchParams(window.location.search).get('step');
    const linked = LEARN_STEPS.findIndex(s => s.id === wanted);
    if (linked >= 0) { setIndex(linked); return; }
    try {
      const saved = Number(localStorage.getItem(STEP_KEY));
      if (saved > 0 && saved < LEARN_STEPS.length) setIndex(saved);
    } catch { /* ignore */ }
  }, []);

  function go(i: number) {
    const next = Math.max(0, Math.min(LEARN_STEPS.length - 1, i));
    setIndex(next);
    try { localStorage.setItem(STEP_KEY, String(next)); } catch { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const step = LEARN_STEPS[index];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 grid lg:grid-cols-[230px_1fr] gap-8">
      <nav aria-label="Workshop steps" className="lg:sticky lg:top-24 self-start">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink2 mb-2">Step {index + 1} of {LEARN_STEPS.length}</p>
        <div className="h-2 bg-paper2 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-clay transition-all" style={{ width: `${((index + 1) / LEARN_STEPS.length) * 100}%` }} />
        </div>
        <ol className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {LEARN_STEPS.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <button
                onClick={() => go(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${
                  i === index ? 'bg-clay text-white' : i < index ? 'text-sage-dark hover:bg-paper2' : 'text-ink2 hover:bg-paper2'
                }`}
              >
                {i + 1}. {s.short}{earned.includes(s.id) ? ` ${BADGES[s.id].emoji}` : ''}
              </button>
            </li>
          ))}
        </ol>
        <BadgeShelf earned={earned} />
      </nav>
      <Confetti key={`c${burst.n}`} burst={burst.n} />
      <BadgeToast key={`t${burst.n}`} stepId={burst.id} burst={burst.n} />

      <section>
        <h1 className="font-display text-[clamp(30px,4vw,44px)] text-ink mb-6">{step.title}</h1>
        <StepBody id={step.id} earned={earned} earn={earn} />
        <div className="flex justify-between mt-10 pt-6 border-t border-ink2/15">
          <button
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-ink2 disabled:opacity-30"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {index < LEARN_STEPS.length - 1 && (
            <button onClick={() => go(index + 1)} className="inline-flex items-center gap-2 bg-clay hover:bg-clay-dark text-white font-semibold px-5 py-2 rounded-xl">
              Next: {LEARN_STEPS[index + 1].short} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
