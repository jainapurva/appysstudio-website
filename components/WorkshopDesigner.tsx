'use client';

import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Send, Box, Download, ExternalLink, RotateCcw, Loader2, CheckCircle2, Copy, ClipboardPaste } from 'lucide-react';
import { DESIGN_TEMPLATES, FOLLOW_UPS, type DesignKind } from '@/lib/workshop-learn';
import { extractCode, explanation, type ChatTurn } from '@/lib/workshop-ai';
import { playgroundUrl, findNumbers, setNumber } from '@/lib/playground';

const CODE_KEY = 'workshop-ai-code';
const DESIGN_KEY = 'workshop-design';

function storageGet(key: string): string {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}
function storageSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: fine */ }
}

function PasteBox({ value, onChange, onUse, label }: { value: string; onChange: (v: string) => void; onUse: () => void; label: string }) {
  return (
    <div className="rounded-xl bg-paper2 p-4">
      <label className="text-sm font-semibold text-ink block mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={6}
        className="w-full rounded-lg border border-ink2/30 p-3 font-mono text-xs bg-white"
        placeholder="Paste Claude's whole answer here. The code will be picked out of it."
      />
      <button onClick={onUse} className="mt-2 inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-white font-semibold px-4 py-2 rounded-xl">
        <ClipboardPaste className="w-4 h-4" /> Show my design
      </button>
    </div>
  );
}

export default function WorkshopDesigner({ onDesigned, onSent }: { onDesigned?: () => void; onSent?: () => void } = {}) {
  const [kind, setKind] = useState<DesignKind>('keycap');
  const [prompt, setPrompt] = useState(DESIGN_TEMPLATES.keycap.prompt);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [live, setLive] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [aiCode, setAiCode] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [needCode, setNeedCode] = useState(false);
  const [codeRequired, setCodeRequired] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerKey, setViewerKey] = useState(0);
  const [name, setName] = useState('');
  const [sent, setSent] = useState('');
  // null while checking; false = no AI connection, so the instructor runs the
  // prompt in their own Claude and the code is pasted back in.
  const [aiOn, setAiOn] = useState<boolean | null>(null);
  const [pasted, setPasted] = useState('');
  const [copied, setCopied] = useState('');
  // One Claude session per design on the agent's server, like a WhatsApp chat
  // in Swayat: the first ask starts it, follow-ups resume it.
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    fetch('/api/workshop/design')
      .then(r => r.json())
      .then((j: { aiEnabled?: boolean; codeRequired?: boolean }) => {
        setAiOn(Boolean(j.aiEnabled));
        setCodeRequired(Boolean(j.codeRequired));
      })
      .catch(() => setAiOn(false));
  }, []);

  useEffect(() => {
    setAccessCode(storageGet(CODE_KEY));
    const saved = storageGet(DESIGN_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved) as { code: string; kind: DesignKind; sessionId?: string };
        if (d.code) { setCode(d.code); setAiCode(d.code); setKind(d.kind); setSessionId(d.sessionId ?? ''); }
      } catch { /* ignore a bad save */ }
    }
  }, []);

  useEffect(() => {
    if (code) storageSet(DESIGN_KEY, JSON.stringify({ code, kind, sessionId }));
  }, [code, kind, sessionId]);

  const numbers = useMemo(() => findNumbers(code), [code]);

  function pickKind(k: DesignKind) {
    setKind(k);
    setPrompt(DESIGN_TEMPLATES[k].prompt);
  }

  async function show(c: string) {
    onDesigned?.();
    setViewerUrl(await playgroundUrl(c));
    setViewerKey(k => k + 1);   // a fresh iframe: the Playground ignores a new link in an open page
  }

  async function ask(request: string, fresh: boolean) {
    const text = request.trim();
    if (!text || busy) return;
    // Keep the conversation short: past a few rounds, restart it around the
    // current design instead of resending the whole history.
    let prior: ChatTurn[] = fresh ? [] : turns;
    if (prior.length >= 9) prior = [];
    // The AI must see the kid's version whenever it is not already in the
    // history, including numbers the kid changed by hand.
    const edited = code !== aiCode;
    const content = !fresh && code && (prior.length === 0 || edited)
      ? `Here is my design${edited ? ' now (I changed some numbers)' : ''}:\n\`\`\`openscad\n${code}\`\`\`\n\n${text}`
      : text;
    const messages: ChatTurn[] = [...prior, { role: 'user', content }];
    // A fresh design, or a trimmed conversation, starts a new session.
    const session = fresh || prior.length === 0 || !sessionId ? crypto.randomUUID() : sessionId;
    setSessionId(session);

    setBusy(true); setError(''); setNote(''); setLive(''); setSent('');
    try {
      const res = await fetch('/api/workshop/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, accessCode, sessionId: session }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({} as { error?: string; code?: string }));
        if (j.code === 'ACCESS_CODE') setNeedCode(true);
        setError(j.error || 'Something went wrong. Try again.');
        return;
      }
      setNeedCode(false);
      storageSet(CODE_KEY, accessCode);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setLive(full);
      }
      const [reply, err] = full.split('[[ERROR]]');
      if (err) setError(err.trim());
      const newCode = extractCode(reply);
      if (!newCode) {
        if (!err) setError('The AI didn\'t send any code that time. Try asking again.');
        return;
      }
      setTurns([...messages, { role: 'assistant', content: reply.trim() }]);
      setCode(newCode);
      setAiCode(newCode);
      setNote(explanation(reply));
      setLive('');
      setFollowUp('');
      await show(newCode);
    } catch {
      setError('Could not reach the AI. Check the Wi-Fi and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Older browsers: fall back to a hidden textarea.
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
    }
    setCopied(label);
    setTimeout(() => setCopied(''), 2500);
  }

  function changeRequest(text: string) {
    return `Here is my design:\n\`\`\`openscad\n${code}\`\`\`\n\n${text.trim()}`;
  }

  async function applyPasted() {
    const fenced = extractCode(pasted);
    const newCode = fenced ?? (pasted.trim() ? pasted.trim() + '\n' : '');
    if (!newCode) { setError('Paste the code from Claude first.'); return; }
    setError(''); setSent('');
    setCode(newCode); setAiCode(newCode); setTurns([]);
    setNote(fenced ? explanation(pasted) : '');
    setPasted(''); setFollowUp('');
    await show(newCode);
  }

  function startOver() {
    setSessionId('');
    setTurns([]); setCode(''); setAiCode(''); setNote(''); setLive(''); setError('');
    setViewerUrl(''); setSent('');
    storageSet(DESIGN_KEY, '');
    setPrompt(DESIGN_TEMPLATES[kind].prompt);
  }

  function download() {
    const blob = new Blob([code], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(name || 'my').replace(/[^a-z0-9]+/gi, '-')}-${kind}.scad`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function openFull() {
    window.open(await playgroundUrl(code, { editor: true, customizer: true }), '_blank', 'noopener');
  }

  async function send() {
    if (!name.trim()) { setError('Type your first name so we know whose design it is.'); return; }
    setError('');
    const res = await fetch('/api/workshop/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, kind, code }),
    });
    const j = await res.json().catch(() => ({} as { error?: string }));
    if (!res.ok) { setError(j.error || 'Could not send it. Try again.'); return; }
    onSent?.();
    setSent(`Sent! Your ${DESIGN_TEMPLATES[kind].label.toLowerCase()} is at the print station, ${name.trim()}.`);
  }

  return (
    <div className="space-y-6">
      {/* Workshop code */}
      {aiOn !== false && (codeRequired || needCode) && (
      <div className={`rounded-xl p-4 ${needCode ? 'bg-butter' : 'bg-paper2'}`}>
        <label className="text-sm font-semibold text-ink block mb-1">Workshop code (it&apos;s on the board)</label>
        <input
          value={accessCode}
          onChange={e => setAccessCode(e.target.value)}
          className="w-full sm:w-64 rounded-lg border border-ink2/30 px-3 py-2 bg-white"
          placeholder="e.g. CLICK"
        />
      </div>
      )}

      {!code && (
        <>
          {/* 1. What are you making? */}
          <div>
            <h3 className="font-display text-xl text-ink mb-2">1. What are you designing?</h3>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DESIGN_TEMPLATES) as DesignKind[]).map(k => (
                <button
                  key={k}
                  onClick={() => pickKind(k)}
                  className={`px-4 py-2 rounded-full border-2 font-semibold ${kind === k ? 'bg-clay text-white border-clay' : 'bg-white text-ink border-ink2/20 hover:border-clay'}`}
                >
                  {DESIGN_TEMPLATES[k].label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. The prompt */}
          <div>
            <h3 className="font-display text-xl text-ink mb-1">2. Your prompt</h3>
            <p className="text-sm text-ink2 mb-2">
              Change the letter, the name or any number. Try deleting some lines to see what the AI guesses!
            </p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={12}
              className="w-full rounded-xl border border-ink2/30 p-3 font-mono text-sm bg-white"
            />
            {aiOn === false ? (
              <div className="mt-3 space-y-3">
                <button
                  onClick={() => copyText(prompt, 'prompt')}
                  className="inline-flex items-center gap-2 bg-clay hover:bg-clay-dark text-white font-semibold px-5 py-3 rounded-xl"
                >
                  <Copy className="w-5 h-5" /> {copied === 'prompt' ? 'Copied!' : 'Copy my prompt'}
                </button>
                <p className="text-sm text-ink2">Show your prompt to your instructor. They&apos;ll ask Claude on the big screen, then paste the answer below.</p>
                <PasteBox value={pasted} onChange={setPasted} onUse={applyPasted} label="Paste the code from Claude" />
              </div>
            ) : (
              <>
                <button
                  onClick={() => ask(prompt, true)}
                  disabled={busy}
                  className="mt-3 inline-flex items-center gap-2 bg-clay hover:bg-clay-dark disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl"
                >
                  {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {busy ? 'Claude is designing…' : 'Ask Claude to design it'}
                </button>
                <details className="mt-4">
                  <summary className="text-sm text-ink2 cursor-pointer">Got code from Claude another way? Paste it instead</summary>
                  <div className="mt-2"><PasteBox value={pasted} onChange={setPasted} onUse={applyPasted} label="Paste the code from Claude" /></div>
                </details>
              </>
            )}
          </div>
        </>
      )}

      {busy && live && (
        <div>
          <p className="text-sm font-semibold text-ink2 mb-1">Claude is writing your code…</p>
          <pre className="rounded-xl bg-ink text-paper p-4 text-xs overflow-auto max-h-80 whitespace-pre-wrap">{live}</pre>
        </div>
      )}

      {error && <div className="rounded-xl bg-butter p-4 text-ink font-semibold">{error}</div>}

      {code && (
        <div className="space-y-6">
          {note && (
            <div className="rounded-xl bg-white p-4 shadow-[0_2px_0_rgba(61,47,36,.1)]">
              <p className="text-sm font-semibold text-clay mb-1">Claude says</p>
              <p className="text-ink whitespace-pre-wrap">{note}</p>
            </div>
          )}

          {/* The 3D view */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-display text-xl text-ink mr-auto">See it in 3D</h3>
              <button onClick={() => show(code)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-sage text-white text-sm font-semibold hover:bg-sage-dark">
                <Box className="w-4 h-4" /> Update 3D view
              </button>
              <button onClick={openFull} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-ink2/20 text-sm font-semibold">
                <ExternalLink className="w-4 h-4" /> Open big
              </button>
            </div>
            {viewerUrl ? (
              <iframe
                key={viewerKey}
                src={viewerUrl}
                title="3D view of your design"
                className="w-full h-[480px] rounded-xl border border-ink2/20 bg-white"
              />
            ) : (
              <button onClick={() => show(code)} className="w-full h-40 rounded-xl border-2 border-dashed border-ink2/30 text-ink2 font-semibold">
                Show my design in 3D
              </button>
            )}
            <p className="text-xs text-ink2 mt-1">
              If the view stays empty, press the <b>Render</b> button at the bottom of the 3D view. Drag to spin it.
            </p>
          </div>

          {/* The numbers */}
          {numbers.length > 0 && (
            <div>
              <h3 className="font-display text-xl text-ink mb-1">Change the numbers</h3>
              <p className="text-sm text-ink2 mb-2">These are the sizes the AI used. Change one, then press <b>Update 3D view</b>.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {numbers.map(n => (
                  <label key={n.line} className="bg-white rounded-lg p-2 flex items-center gap-2 shadow-[0_1px_0_rgba(61,47,36,.1)]">
                    <span className="flex-1 text-sm">
                      <span className="font-mono font-semibold text-ink">{n.name}</span>
                      {n.comment && <span className="block text-xs text-ink2">{n.comment}</span>}
                    </span>
                    <input
                      value={n.isText ? n.value.slice(1, -1) : n.value}
                      onChange={e => setCode(c => setNumber(c, n, e.target.value))}
                      className="w-24 rounded border border-ink2/30 px-2 py-1 text-right font-mono"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Talk to the AI again */}
          <div>
            <h3 className="font-display text-xl text-ink mb-1">Ask for a change</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {FOLLOW_UPS.map(f => (
                <button key={f} onClick={() => setFollowUp(f)} className="text-xs px-3 py-1 rounded-full bg-paper2 hover:bg-butter text-ink">
                  {f}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && aiOn !== false) ask(followUp, false); }}
                className="flex-1 rounded-xl border border-ink2/30 px-3 py-2 bg-white"
                placeholder="Tell Claude what to change…"
              />
              {aiOn === false ? (
                <button
                  onClick={() => followUp.trim() && copyText(changeRequest(followUp), 'change')}
                  className="inline-flex items-center gap-2 bg-clay hover:bg-clay-dark text-white font-semibold px-4 rounded-xl"
                >
                  <Copy className="w-4 h-4" /> {copied === 'change' ? 'Copied!' : 'Copy request'}
                </button>
              ) : (
                <button
                  onClick={() => ask(followUp, false)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 bg-clay hover:bg-clay-dark disabled:opacity-60 text-white font-semibold px-4 rounded-xl"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Ask
                </button>
              )}
            </div>
            {aiOn === false && (
              <div className="mt-3">
                <p className="text-sm text-ink2 mb-2">The request includes your design, so Claude knows what to change. Your instructor pastes Claude&apos;s answer here:</p>
                <PasteBox value={pasted} onChange={setPasted} onUse={applyPasted} label="Paste Claude's new code" />
              </div>
            )}
          </div>

          {/* The code itself */}
          <details className="bg-white rounded-xl p-4">
            <summary className="font-semibold text-ink cursor-pointer">See the code (the recipe for your shape)</summary>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              rows={18}
              className="mt-3 w-full rounded-lg border border-ink2/20 p-3 font-mono text-xs"
            />
          </details>

          {/* Send it */}
          <div className="rounded-xl bg-paper2 p-4">
            <h3 className="font-display text-xl text-ink mb-2">Happy with it?</h3>
            <div className="flex flex-wrap gap-2">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="rounded-xl border border-ink2/30 px-3 py-2 bg-white"
                placeholder="Your first name"
              />
              <button onClick={send} className="inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-white font-semibold px-4 py-2 rounded-xl">
                <Send className="w-4 h-4" /> Send to the print station
              </button>
              <button onClick={download} className="inline-flex items-center gap-2 bg-white border border-ink2/20 font-semibold px-4 py-2 rounded-xl">
                <Download className="w-4 h-4" /> Download
              </button>
              <button onClick={startOver} className="inline-flex items-center gap-2 text-ink2 font-semibold px-3 py-2">
                <RotateCcw className="w-4 h-4" /> Start a new design
              </button>
            </div>
            {sent && <p className="mt-3 inline-flex items-center gap-2 text-sage-dark font-semibold"><CheckCircle2 className="w-5 h-5" /> {sent}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
