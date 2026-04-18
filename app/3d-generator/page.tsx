'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  ArrowLeft, Sparkles, Upload, X, Loader2, RotateCcw,
  ShoppingCart, Clock, CheckCircle, AlertCircle, Eye,
  LogIn, Zap, Star, Printer, Send,
} from 'lucide-react';

const ModelViewer = dynamic(() => import('@/components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-950 rounded-2xl">
      <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
    </div>
  ),
});

type Tab = 'text' | 'image';
type JobStatus = 'pending' | 'generating' | 'done' | 'error';

interface GenerationJob {
  taskId: string;
  mode: Tab;
  prompt: string;
  status: JobStatus;
  progress: number;
  glbUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  lastProgressAt?: string; // ISO timestamp of last progress change — for stall detection
}

interface CreditInfo {
  freeRemaining: number;
  paidCredits: number;
  totalRemaining: number;
}

const CREDIT_PACKS = [
  { id: 'starter', label: 'Starter',  credits: 5,  price: 1.99, popular: false, perCredit: '$0.40' },
  { id: 'popular', label: 'Popular',  credits: 15, price: 4.99, popular: true,  perCredit: '$0.33' },
  { id: 'pro',     label: 'Pro',      credits: 40, price: 9.99, popular: false, perCredit: '$0.25' },
];

const STORAGE_KEY = 'appys_3d_generations';

function loadJobs(): GenerationJob[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveJobs(jobs: GenerationJob[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs.slice(0, 20)));
}

// ── Sign-in wall ─────────────────────────────────────────────────────────────
function SignInWall() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-purple-500/20">
        <Sparkles className="w-10 h-10 text-purple-400" />
      </div>
      <h2 className="text-2xl font-extrabold mb-2">Sign in to use the AI Generator</h2>
      <p className="text-gray-400 text-sm max-w-sm mb-2">
        Create a free account and get <span className="text-purple-300 font-semibold">2 free 3D generations</span> instantly.
        No credit card required.
      </p>
      <div className="flex gap-6 text-sm text-gray-500 mb-8">
        <span>✓ 2 free generations</span>
        <span>✓ Preview in browser</span>
        <span>✓ Order as a print</span>
      </div>
      <button
        onClick={() => signIn(undefined, { callbackUrl: '/3d-generator' })}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-purple-500/25"
      >
        <LogIn className="w-4 h-4" /> Sign in / Create Account
      </button>
    </div>
  );
}

// ── Credit purchase modal ─────────────────────────────────────────────────────
function PurchaseModal({ onClose, onPurchase, purchasing }: {
  onClose: () => void;
  onPurchase: (packId: string) => void;
  purchasing: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-2xl border border-gray-700 p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold">Get more generations</h3>
            <p className="text-gray-400 text-xs mt-0.5">Credits never expire · Use anytime</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          {CREDIT_PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => onPurchase(pack.id)}
              disabled={purchasing !== null}
              className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all disabled:opacity-60 ${
                pack.popular
                  ? 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/20'
                  : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {pack.popular && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                {!pack.popular && <Zap className="w-4 h-4 text-gray-400" />}
                <div className="text-left">
                  <div className="font-semibold text-sm flex items-center gap-2">
                    {pack.label}
                    {pack.popular && <span className="text-[10px] bg-purple-500 text-white px-1.5 py-0.5 rounded-full">Best Value</span>}
                  </div>
                  <div className="text-gray-400 text-xs">{pack.credits} generations · {pack.perCredit} each</div>
                </div>
              </div>
              <div className="text-right">
                {purchasing === pack.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                ) : (
                  <span className="font-bold text-sm">${pack.price}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Secure checkout via Square · USD pricing
        </p>
      </div>
    </div>
  );
}

// ── Credit badge ──────────────────────────────────────────────────────────────
function CreditBadge({ info, onBuy }: { info: CreditInfo; onBuy: () => void }) {
  const total = info.totalRemaining;
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
        total === 0 ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
        : total <= 2 ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
        : 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20'
      }`}>
        <Sparkles className="w-3 h-3" />
        {total === 0 ? 'No credits' : `${total} credit${total !== 1 ? 's' : ''} left`}
        {info.freeRemaining > 0 && <span className="text-[10px] opacity-70">({info.freeRemaining} free)</span>}
      </div>
      <button onClick={onBuy} className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium">
        + Buy more
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GeneratorPage() {
  const { data: session, status: authStatus } = useSession();
  const [tab, setTab] = useState<Tab>('text');
  const [prompt, setPrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<GenerationJob | null>(null);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ name: '', email: '', material: 'PLA', color: 'Black', notes: '' });
  const [quoteStatus, setQuoteStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load jobs and credits on mount
  useEffect(() => {
    const saved = loadJobs();
    setJobs(saved);
    const done = saved.find(j => j.status === 'done' && j.glbUrl);
    if (done) setSelectedJob(done);
  }, []);

  // Fetch credit balance + pre-fill quote form when logged in
  useEffect(() => {
    if (session?.user) {
      fetch('/api/ai-credits').then(r => r.json()).then(setCreditInfo).catch(() => {});
      setQuoteForm(prev => ({
        ...prev,
        name: session.user?.name || '',
        email: session.user?.email || '',
      }));
    }
  }, [session]);

  // Handle credit purchase redirect back
  useEffect(() => {
    if (!session?.user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('credits_purchased') !== '1') return;
    const packId = params.get('pack') || '';
    const squareOrderId = sessionStorage.getItem('creditOrderId');
    if (!squareOrderId) return;

    fetch('/api/ai-credits/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ squareOrderId, packId }),
    })
      .then(r => r.json())
      .then(() => {
        sessionStorage.removeItem('creditOrderId');
        return fetch('/api/ai-credits').then(r => r.json()).then(setCreditInfo);
      })
      .catch(() => {});

    // Clean URL
    window.history.replaceState({}, '', '/3d-generator');
  }, [session]);

  const pollJobs = useCallback(async (currentJobs: GenerationJob[]) => {
    const active = currentJobs.filter(j => j.status === 'pending' || j.status === 'generating');
    if (active.length === 0) return;
    const updated = [...currentJobs];
    let changed = false;
    const now = new Date();

    await Promise.all(active.map(async (job) => {
      try {
        // Auto-timeout: if stalled at same progress for >20 min, mark failed
        const lastUpdate = job.lastProgressAt ? new Date(job.lastProgressAt) : new Date(job.createdAt);
        const stalledMinutes = (now.getTime() - lastUpdate.getTime()) / 60000;
        if (stalledMinutes > 20) {
          const idx = updated.findIndex(j => j.taskId === job.taskId);
          if (idx !== -1) { updated[idx] = { ...job, status: 'error' }; changed = true; }
          return;
        }

        const res = await fetch(`/api/3d-status?taskId=${job.taskId}&mode=${job.mode}`);
        const data = await res.json();
        const idx = updated.findIndex(j => j.taskId === job.taskId);
        if (idx === -1) return;
        const prev = updated[idx];
        const nowIso = now.toISOString();

        if (data.status === 'SUCCEEDED') {
          if (data.glbUrl) {
            updated[idx] = { ...prev, status: 'done', progress: 100, glbUrl: data.glbUrl, thumbnailUrl: data.thumbnailUrl, lastProgressAt: nowIso };
          } else {
            // SUCCEEDED but no model URL yet — keep polling briefly (Meshy CDN delay)
            updated[idx] = { ...prev, status: 'generating', progress: 99, lastProgressAt: nowIso };
          }
          changed = true;
        } else if (data.status === 'FAILED') {
          updated[idx] = { ...prev, status: 'error', progress: 0 };
          changed = true;
        } else if (data.status === 'IN_PROGRESS') {
          const progressChanged = data.progress !== prev.progress;
          updated[idx] = {
            ...prev,
            status: 'generating',
            progress: data.progress || 0,
            thumbnailUrl: data.thumbnailUrl || prev.thumbnailUrl,
            lastProgressAt: progressChanged ? nowIso : (prev.lastProgressAt || nowIso),
          };
          changed = true;
        }
      } catch { /* silent */ }
    }));

    if (changed) {
      setJobs(updated);
      saveJobs(updated);
      const newDone = updated.find(j => j.status === 'done' && j.glbUrl && currentJobs.find(c => c.taskId === j.taskId)?.status !== 'done');
      if (newDone) setSelectedJob(newDone);
    }
  }, []);

  // Manual check for a single job
  const checkSingleJob = useCallback(async (job: GenerationJob) => {
    try {
      const res = await fetch(`/api/3d-status?taskId=${job.taskId}&mode=${job.mode}`);
      const data = await res.json();
      setJobs(current => {
        const updated = [...current];
        const idx = updated.findIndex(j => j.taskId === job.taskId);
        if (idx === -1) return current;
        const prev = updated[idx];
        const nowIso = new Date().toISOString();
        if (data.status === 'SUCCEEDED' && data.glbUrl) {
          updated[idx] = { ...prev, status: 'done', progress: 100, glbUrl: data.glbUrl, thumbnailUrl: data.thumbnailUrl, lastProgressAt: nowIso };
          setSelectedJob(updated[idx]);
        } else if (data.status === 'FAILED') {
          updated[idx] = { ...prev, status: 'error' };
        } else if (data.status === 'IN_PROGRESS' || data.status === 'SUCCEEDED') {
          updated[idx] = { ...prev, status: 'generating', progress: data.progress || prev.progress, lastProgressAt: nowIso };
        }
        saveJobs(updated);
        return updated;
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const hasPending = jobs.some(j => j.status === 'pending' || j.status === 'generating');
    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(() => {
        setJobs(current => { pollJobs(current); return current; });
      }, 5000);
    } else if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [jobs, pollJobs]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleGenerate = async () => {
    if (tab === 'text' && !prompt.trim()) return;
    if (tab === 'image' && !imageFile) return;
    setSubmitting(true);
    setError('');

    try {
      let imageUrl: string | undefined;
      if (tab === 'image' && imageFile) {
        const form = new FormData();
        form.append('file', imageFile);
        const uploadRes = await fetch('/api/upload-image', { method: 'POST', body: form });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.url) {
          setError(uploadData.error || 'Failed to upload image.');
          setSubmitting(false);
          return;
        }
        imageUrl = uploadData.url;
      }

      const res = await fetch('/api/3d-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: tab, prompt: prompt.trim(), imageUrl }),
      });
      const data = await res.json();

      if (res.status === 402) {
        setShowPurchase(true);
        setSubmitting(false);
        return;
      }
      if (!res.ok || !data.taskId) {
        setError(data.error || 'Failed to start generation.');
        setSubmitting(false);
        return;
      }

      const newJob: GenerationJob = {
        taskId: data.taskId,
        mode: tab,
        prompt: tab === 'text' ? prompt.trim() : (imageFile?.name || 'Image upload'),
        status: 'pending',
        progress: 0,
        glbUrl: null,
        thumbnailUrl: null,
        createdAt: new Date().toISOString(),
      };
      setJobs(prev => { const u = [newJob, ...prev]; saveJobs(u); return u; });
      setPrompt('');
      setImageFile(null);
      setImagePreview(null);

      // Refresh credit display
      if (data.creditsRemaining !== undefined) {
        setCreditInfo(prev => prev ? { ...prev, totalRemaining: data.creditsRemaining } : prev);
      }
      fetch('/api/ai-credits').then(r => r.json()).then(setCreditInfo).catch(() => {});
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  const handlePurchase = async (packId: string) => {
    setPurchasing(packId);
    try {
      const res = await fetch('/api/ai-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        alert(data.error || 'Failed to start checkout');
        setPurchasing(null);
        return;
      }
      sessionStorage.setItem('creditOrderId', data.squareOrderId);
      window.location.href = data.url;
    } catch {
      alert('Something went wrong');
      setPurchasing(null);
    }
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    setQuoteStatus('submitting');
    try {
      const fd = new FormData();
      fd.append('name', quoteForm.name);
      fd.append('email', quoteForm.email);
      fd.append('material', quoteForm.material);
      fd.append('color', quoteForm.color);
      fd.append('quantity', '1');
      fd.append('fileName', `AI Generated — ${selectedJob.prompt}`);
      fd.append('notes',
        `AI-Generated 3D Model\n` +
        `Prompt / Source: ${selectedJob.prompt}\n` +
        `Task ID: ${selectedJob.taskId}\n` +
        `Preview: ${selectedJob.thumbnailUrl || 'N/A'}\n\n` +
        (quoteForm.notes ? `Customer notes: ${quoteForm.notes}` : '')
      );
      const res = await fetch('/api/quote', { method: 'POST', body: fd });
      setQuoteStatus(res.ok ? 'success' : 'error');
    } catch {
      setQuoteStatus('error');
    }
  };

  const clearAll = () => { setJobs([]); setSelectedJob(null); localStorage.removeItem(STORAGE_KEY); };
  const refreshAll = useCallback(async () => { await pollJobs(loadJobs()); }, [pollJobs]);
  const pendingCount = jobs.filter(j => j.status === 'pending' || j.status === 'generating').length;

  const examplePrompts = [
    'A cute robot holding a coffee cup',
    'A miniature medieval castle',
    'A geometric vase',
    'A dinosaur skull trophy',
    'A sleek desk lamp',
  ];

  // Loading auth state
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {showPurchase && (
        <PurchaseModal
          onClose={() => setShowPurchase(false)}
          onPurchase={handlePurchase}
          purchasing={purchasing}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to shop
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-300 text-sm font-semibold px-4 py-2 rounded-full mb-4 ring-1 ring-purple-500/20">
              <Sparkles className="w-4 h-4" /> AI-Powered 3D Generator
            </div>
            <h1 className="text-4xl font-extrabold mb-2">Turn Ideas into 3D Models</h1>
            <p className="text-gray-400">Type a description or upload an image — we&apos;ll generate a printable 3D model.</p>
          </div>
          {session?.user && creditInfo && (
            <CreditBadge info={creditInfo} onBuy={() => setShowPurchase(true)} />
          )}
        </div>

        {/* Show sign-in wall if not authenticated */}
        {!session?.user ? (
          <SignInWall />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left — Input */}
              <div className="lg:col-span-1">
                <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                  {/* No-credits banner */}
                  {creditInfo && creditInfo.totalRemaining === 0 && (
                    <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                      <p className="text-amber-300 text-sm font-semibold mb-2">You&apos;ve used all your free generations</p>
                      <button
                        onClick={() => setShowPurchase(true)}
                        className="text-xs bg-amber-500 hover:bg-amber-600 text-black font-bold px-4 py-1.5 rounded-lg transition-colors"
                      >
                        Get more — from $1.99
                      </button>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="flex rounded-xl bg-gray-800 p-1 mb-5">
                    {(['text', 'image'] as Tab[]).map(t => (
                      <button key={t} onClick={() => setTab(t)} disabled={submitting}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                        {t === 'text' ? '✏️ Text' : '🖼️ Image'}
                      </button>
                    ))}
                  </div>

                  {tab === 'text' ? (
                    <div className="space-y-3">
                      <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                        placeholder="Describe what you want to 3D print..."
                        rows={3} disabled={submitting}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none disabled:opacity-50"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {examplePrompts.map(p => (
                          <button key={p} onClick={() => setPrompt(p)} disabled={submitting}
                            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-lg transition-colors">
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {imagePreview ? (
                        <div className="relative rounded-xl overflow-hidden aspect-square bg-gray-800">
                          <img src={imagePreview} alt="Uploaded" className="w-full h-full object-contain" />
                          <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()}
                          className="w-full aspect-square border-2 border-dashed border-gray-700 hover:border-purple-500 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:text-purple-400 transition-all">
                          <Upload className="w-8 h-8" />
                          <span className="text-sm">Click to upload image</span>
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </div>
                  )}

                  <button onClick={handleGenerate}
                    disabled={submitting || (tab === 'text' && !prompt.trim()) || (tab === 'image' && !imageFile) || (creditInfo?.totalRemaining === 0)}
                    className="mt-4 w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-500/25">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</> : <><Sparkles className="w-4 h-4" /> Generate 3D Model</>}
                  </button>

                  {creditInfo && creditInfo.totalRemaining > 0 && (
                    <p className="text-center text-xs text-gray-500 mt-2">Uses 1 credit · {creditInfo.totalRemaining} remaining</p>
                  )}

                  {error && <p className="mt-3 text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

                  {pendingCount > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-purple-300 bg-purple-500/10 px-3 py-2 rounded-lg">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {pendingCount} model{pendingCount > 1 ? 's' : ''} generating — checking every 5s
                    </div>
                  )}
                </div>
              </div>

              {/* Right — 3D Viewer */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                {selectedJob?.glbUrl ? (
                  <>
                    <div className="h-[420px]">
                      <ModelViewer glbUrl={selectedJob.glbUrl} />
                    </div>

                    {/* Model info + order button */}
                    <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800">
                      <div className="flex items-start gap-3">
                        {selectedJob.thumbnailUrl && (
                          <img src={selectedJob.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-700" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{selectedJob.prompt}</p>
                          <p className="text-gray-400 text-xs mt-0.5">AI-generated 3D model · Ready to print</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setShowQuoteForm(v => !v); setQuoteStatus('idle'); }}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold text-sm transition-all"
                      >
                        <Printer className="w-4 h-4" />
                        {showQuoteForm ? 'Hide Order Form' : 'Order This as a Print'}
                      </button>
                    </div>

                    {/* Inline quote form */}
                    {showQuoteForm && (
                      <div className="bg-gray-900 rounded-2xl border border-purple-500/30 p-5">
                        {quoteStatus === 'success' ? (
                          <div className="text-center py-6">
                            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                            <p className="font-bold text-lg">Quote Request Sent!</p>
                            <p className="text-gray-400 text-sm mt-1">We&apos;ll email you with pricing within 24 hours.</p>
                            <button onClick={() => { setShowQuoteForm(false); setQuoteStatus('idle'); }}
                              className="mt-4 text-sm text-purple-400 hover:text-purple-300">Done</button>
                          </div>
                        ) : (
                          <form onSubmit={handleQuoteSubmit} className="space-y-3">
                            <div className="flex items-center gap-2 mb-4">
                              <ShoppingCart className="w-4 h-4 text-purple-400" />
                              <h3 className="font-bold text-sm">Request a Print Quote</h3>
                            </div>

                            {/* Model reference */}
                            <div className="flex items-center gap-2 bg-gray-800 rounded-xl p-3 border border-gray-700">
                              {selectedJob.thumbnailUrl && (
                                <img src={selectedJob.thumbnailUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-600" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs text-gray-400">Your AI model</p>
                                <p className="text-sm font-medium truncate">{selectedJob.prompt}</p>
                              </div>
                              <CheckCircle className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Your Name</label>
                                <input required value={quoteForm.name} onChange={e => setQuoteForm(p => ({ ...p, name: e.target.value }))}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                                <input required type="email" value={quoteForm.email} onChange={e => setQuoteForm(p => ({ ...p, email: e.target.value }))}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Material</label>
                                <select value={quoteForm.material} onChange={e => setQuoteForm(p => ({ ...p, material: e.target.value }))}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                                  {['PLA', 'PETG', 'TPU', 'ABS', 'Not sure'].map(m => <option key={m}>{m}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Color</label>
                                <select value={quoteForm.color} onChange={e => setQuoteForm(p => ({ ...p, color: e.target.value }))}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                                  {['Black', 'White', 'Grey', 'Red', 'Blue', 'Green', 'Orange', 'Purple', 'Any'].map(c => <option key={c}>{c}</option>)}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">Extra notes (optional)</label>
                              <textarea value={quoteForm.notes} onChange={e => setQuoteForm(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Size, quantity, special requests..."
                                rows={2}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                            </div>

                            {quoteStatus === 'error' && (
                              <p className="text-red-400 text-xs">Something went wrong — please try again.</p>
                            )}

                            <button type="submit" disabled={quoteStatus === 'submitting'}
                              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50">
                              {quoteStatus === 'submitting'
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                : <><Send className="w-4 h-4" /> Send Quote Request</>}
                            </button>
                            <p className="text-xs text-gray-500 text-center">Free quote · We reply within 24h</p>
                          </form>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-[420px] bg-gray-900 rounded-2xl border border-gray-800 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                      <Sparkles className="w-10 h-10 text-gray-600" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-gray-300">3D Preview will appear here</h3>
                    <p className="text-gray-500 text-sm">Generate a model — completed models load here automatically.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery */}
            {jobs.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">My Generations <span className="text-gray-500 text-base font-normal">({jobs.length})</span></h2>
                  <div className="flex items-center gap-3">
                    <button onClick={refreshAll} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                      <RotateCcw className="w-3 h-3" /> Refresh
                    </button>
                    <button onClick={clearAll} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Clear all</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {jobs.map(job => (
                    <div key={job.taskId}
                      onClick={() => job.status === 'done' && job.glbUrl && setSelectedJob(job)}
                      className={`relative rounded-xl overflow-hidden border transition-all ${
                        job.status === 'done' && job.glbUrl ? 'cursor-pointer hover:border-purple-500' : 'cursor-default'
                      } ${selectedJob?.taskId === job.taskId ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-gray-700'}`}
                    >
                      <div className="aspect-square bg-gray-800 relative">
                        {job.thumbnailUrl ? (
                          <img src={job.thumbnailUrl} alt={job.prompt} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                        {job.status === 'pending' && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                            <span className="text-xs text-gray-300">Pending...</span>
                            <button onClick={e => { e.stopPropagation(); checkSingleJob(job); }}
                              className="text-[10px] text-purple-300 underline mt-1">Check now</button>
                          </div>
                        )}
                        {job.status === 'generating' && (
                          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                            <span className="text-xs text-gray-300">{job.progress}%</span>
                            {job.progress >= 95 && (
                              <button onClick={e => { e.stopPropagation(); checkSingleJob(job); }}
                                className="text-[10px] bg-purple-600/80 hover:bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                Check now
                              </button>
                            )}
                          </div>
                        )}
                        {job.status === 'done' && job.glbUrl && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="w-5 h-5 text-green-400 drop-shadow" />
                          </div>
                        )}
                        {job.status === 'error' && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-red-400" />
                          </div>
                        )}
                        {job.status === 'done' && job.glbUrl && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex items-center gap-1 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold">
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-gray-900">
                        <p className="text-xs text-gray-300 truncate">{job.prompt}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {job.status === 'done' ? (
                            <span className="text-[10px] text-green-400">Ready</span>
                          ) : job.status === 'error' ? (
                            <span className="text-[10px] text-red-400">Failed</span>
                          ) : (
                            <span className="text-[10px] text-purple-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Processing</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
