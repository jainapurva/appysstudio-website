'use client';

import { useState } from 'react';
import { Download, ExternalLink, RefreshCw } from 'lucide-react';
import { playgroundUrl } from '@/lib/playground';

interface Design {
  id: string;
  name: string;
  kind: string;
  code: string;
  color?: string;
  createdAt: string;
}

// The print station's inbox: every design kids sent from /workshop/start.
export default function StationPage() {
  const [pwd, setPwd] = useState('');
  const [designs, setDesigns] = useState<Design[] | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const res = await fetch(`/api/workshop/designs?pwd=${encodeURIComponent(pwd)}`);
    if (!res.ok) { setError('Wrong password.'); return; }
    setDesigns((await res.json()).designs);
  }

  async function open(d: Design) {
    window.open(await playgroundUrl(d.code, { editor: true }), '_blank', 'noopener');
  }

  function download(d: Design) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([d.code], { type: 'text/plain' }));
    a.download = `${d.name.replace(/[^a-z0-9]+/gi, '-')}-${d.kind}.scad`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="font-display text-4xl text-ink mb-6">Print station</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="password"
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') load(); }}
          className="rounded-xl border border-ink2/30 px-3 py-2 bg-white"
          placeholder="Admin password"
        />
        <button onClick={load} className="inline-flex items-center gap-2 bg-clay text-white font-semibold px-4 py-2 rounded-xl">
          <RefreshCw className="w-4 h-4" /> {designs ? 'Refresh' : 'Open'}
        </button>
      </div>
      {error && <p className="text-clay font-semibold mb-4">{error}</p>}
      {designs && designs.length === 0 && <p className="text-ink2">No designs yet.</p>}
      <div className="space-y-3">
        {designs?.map(d => (
          <div key={d.id} className="bg-white rounded-xl p-4 shadow-[0_2px_0_rgba(61,47,36,.1)] flex flex-wrap items-center gap-3">
            <div className="mr-auto">
              <p className="font-display text-xl text-ink">{d.name}</p>
              <p className="text-sm text-ink2">{d.kind}{d.color ? ` · ${d.color}` : ''} · {new Date(d.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
            </div>
            <button onClick={() => open(d)} className="inline-flex items-center gap-1 bg-sage text-white font-semibold px-3 py-2 rounded-lg">
              <ExternalLink className="w-4 h-4" /> Open in 3D (then Download STL)
            </button>
            <button onClick={() => download(d)} className="inline-flex items-center gap-1 bg-white border border-ink2/20 font-semibold px-3 py-2 rounded-lg">
              <Download className="w-4 h-4" /> .scad
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
