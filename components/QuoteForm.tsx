'use client';
import { trackEvent } from '@/lib/useAnalytics';
import { useState } from 'react';
import { Upload, CheckCircle, Loader2, FileUp } from 'lucide-react';

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
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/20">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <h3 className="text-2xl font-extrabold mb-3 text-white">Quote Request Received!</h3>
        <p className="text-stone-400 leading-relaxed">We&apos;ll review your file and get back to you with pricing and lead time within 24 hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-stone-800 rounded-3xl border border-stone-700 p-8 space-y-6">
      {/* File Upload */}
      <div>
        <label className="block text-sm font-bold text-stone-200 mb-2">3D File *</label>
        <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-stone-600 rounded-2xl cursor-pointer hover:border-amber-500 transition-all bg-stone-700/50 hover:bg-stone-700 group">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-500/20 transition-colors ring-1 ring-amber-500/20">
            {file ? <FileUp className="w-6 h-6 text-amber-400" /> : <Upload className="w-6 h-6 text-amber-400" />}
          </div>
          <span className="text-sm text-stone-300 font-medium">{file ? file.name : 'Click to upload (STL, OBJ, 3MF, STEP, FBX, PLY, AMF...)'}</span>
          <span className="text-xs text-stone-500 mt-1">Max 50MB</span>
          <input type="file" accept=".stl,.obj,.3mf,.step,.stp,.iges,.igs,.fbx,.ply,.amf,.gcode" className="hidden" onChange={handleFile} />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-stone-200 mb-1.5">Your Name *</label>
          <input required type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" placeholder="Jane Doe" />
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-200 mb-1.5">Email *</label>
          <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" placeholder="jane@example.com" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-stone-200 mb-1.5">Phone (optional)</label>
          <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" placeholder="+1 555 000 0000" />
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-200 mb-1.5">Quantity *</label>
          <input required type="number" min={1} value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: parseInt(e.target.value) }))}
            className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-stone-200 mb-1.5">Material</label>
          <select value={form.material} onChange={e => setForm(p => ({ ...p, material: e.target.value }))}
            className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all">
            {MATERIALS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-stone-200 mb-1.5">Color</label>
          <select value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all">
            {COLORS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-stone-200 mb-1.5">Notes / Special Requirements</label>
        <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          rows={4} className="w-full bg-stone-700 border border-stone-600 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-all"
          placeholder="Any special requirements, infill preferences, surface finish requests, intended use, etc." />
      </div>

      {status === 'error' && (
        <p className="text-red-400 text-sm bg-red-500/10 p-4 rounded-xl ring-1 ring-red-500/20">Something went wrong. Please try again or email us directly.</p>
      )}

      <button type="submit" disabled={status === 'submitting'}
        className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-800 hover:to-amber-700 disabled:from-amber-700/50 disabled:to-amber-600/50 text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-700/25">
        {status === 'submitting' ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : 'Request Quote'}
      </button>

      <p className="text-center text-xs text-stone-500">We typically respond within 24 hours. For urgent requests, email appysstudioca@gmail.com</p>
    </form>
  );
}
