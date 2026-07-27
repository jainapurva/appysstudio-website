'use client';
import { trackEvent } from '@/lib/useAnalytics';
import { useState } from 'react';
import { Upload, Loader2, FileUp } from 'lucide-react';

const MATERIALS = ['PLA', 'PETG', 'TPU', 'ASA', 'ABS', 'Not sure — recommend one'];
const COLORS = ['Black', 'White', 'Grey', 'Red', 'Blue', 'Green', 'Orange', 'Yellow', 'Purple', 'Natural/Beige', 'Custom (specify in notes)'];

export default function QuoteForm() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', material: 'PLA', color: 'Black',
    quantity: 1, notes: '', fileName: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setForm(prev => ({ ...prev, fileName: f.name })); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    trackEvent('quote_submitted', { material: form.material, color: form.color, quantity: form.quantity });
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, String(v)));
      if (file) formData.append('file', file);
      const res = await fetch('/api/quote', { method: 'POST', body: formData });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-paper rounded-3xl p-12 text-center shadow-[0_20px_50px_rgba(61,47,36,.25)]">
        <span className="text-[40px] text-craft-orange craft-spin !animate-[craft-spin_8s_linear_infinite]">✳︎</span>
        <h3 className="font-display text-[26px] text-ink mt-3.5 mb-2">Quote request received!</h3>
        <p className="text-ink2 leading-relaxed">We&apos;ll look at your file and write back with pricing and a lead time within 24 hours.</p>
      </div>
    );
  }

  const labelCls = 'block text-[12.5px] font-bold uppercase tracking-[.1em] text-ink mb-2';

  return (
    <form onSubmit={handleSubmit} className="bg-paper rounded-3xl p-8 space-y-6 shadow-[0_20px_50px_rgba(61,47,36,.25)]">
      {/* File Upload */}
      <div>
        <label className={labelCls}>3D File *</label>
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-clay rounded-2xl cursor-pointer hover:bg-white transition-all bg-white/60 group">
          <div className="w-12 h-12 bg-butter/60 rounded-xl flex items-center justify-center mb-3 group-hover:bg-butter transition-colors">
            {file ? <FileUp className="w-6 h-6 text-clay-dark" /> : <Upload className="w-6 h-6 text-clay-dark" />}
          </div>
          <span className="text-sm text-ink font-medium px-4 text-center">{file ? file.name : 'Click to upload (STL, OBJ, 3MF, STEP, FBX, PLY, AMF...)'}</span>
          <span className="text-xs text-ink2 mt-1">Max 50MB</span>
          <input type="file" accept=".stl,.obj,.3mf,.step,.stp,.iges,.igs,.fbx,.ply,.amf,.gcode" className="hidden" onChange={handleFile} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Your Name *</label>
          <input required type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="craft-input" placeholder="Jane Doe" />
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="craft-input" placeholder="jane@example.com" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Phone (optional)</label>
          <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="craft-input" placeholder="+1 555 000 0000" />
        </div>
        <div>
          <label className={labelCls}>Quantity *</label>
          <input required type="number" min={1} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: parseInt(e.target.value) }))}
            className="craft-input" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Material</label>
          <select value={form.material} onChange={e => setForm(p => ({ ...p, material: e.target.value }))}
            className="craft-input">
            {MATERIALS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Color</label>
          <select value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            className="craft-input">
            {COLORS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes / Special Requirements</label>
        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          rows={4} className="craft-input resize-none"
          placeholder="Any special requirements, infill preferences, surface finish requests, intended use, etc." />
      </div>

      {status === 'error' && (
        <p className="text-[#b3402a] text-sm bg-craft-orange/15 p-4 rounded-xl">Something went wrong. Please try again or email us directly.</p>
      )}

      <button type="submit" disabled={status === 'submitting'} className="btn-clay w-full text-lg">
        {status === 'submitting' ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : 'Get my quote →'}
      </button>

      <p className="text-center text-xs text-ink2">We typically respond within 24 hours. For urgent requests, email appysstudioca@gmail.com</p>
    </form>
  );
}
