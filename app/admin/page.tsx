'use client';
import { useState, useEffect, useCallback } from 'react';
import { BarChart3, ShoppingCart, FileText, Eye, TrendingUp, Package, RefreshCw, Lock } from 'lucide-react';

interface Summary {
  totals: { pageViews: number; productViews: number; cartAdds: number; checkoutsStarted: number; ordersCompleted: number; quotesSubmitted: number };
  last7Days: { pageViews: number; cartAdds: number; orders: number; quotes: number };
  last30Days: { pageViews: number; cartAdds: number; orders: number; quotes: number };
  topProducts: Array<{ name: string; views: number; cartAdds: number }>;
  dailyViews: Array<{ date: string; count: number }>;
  recentEvents: Array<{ id: string; type: string; data: Record<string, string | number>; timestamp: string }>;
}

export default function AdminPage() {
  const [pwd, setPwd] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (password: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics?pwd=${encodeURIComponent(password)}`);
      if (res.status === 401) { setError('Wrong password'); setLoading(false); return; }
      const json = await res.json();
      setData(json);
      setAuthed(true);
    } catch {
      setError('Failed to load data');
    }
    setLoading(false);
  }, []);

  const maxDailyViews = data ? Math.max(...data.dailyViews.map(d => d.count), 1) : 1;

  if (!authed) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-8 w-full max-w-sm text-center">
          <Lock className="w-10 h-10 text-clay mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-6">Admin Dashboard</h1>
          <form onSubmit={e => { e.preventDefault(); load(pwd); }} className="space-y-3">
            <input type="password" placeholder="Admin password" value={pwd} onChange={e => setPwd(e.target.value)}
              className="w-full border border-ink/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-craft-orange" />
            {error && <p className="text-[#b3402a] text-sm">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-clay hover:bg-clay-dark text-white py-3 rounded-xl font-bold transition-colors">
              {loading ? 'Loading...' : 'Enter'}
            </button>
          </form>
          <p className="text-xs text-ink2/70 mt-3">Default password: printcraft2025 (set ADMIN_PASSWORD env var to change)</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const convRate = data.totals.cartAdds > 0
    ? ((data.totals.ordersCompleted / data.totals.cartAdds) * 100).toFixed(1)
    : '0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink flex items-center gap-2"><BarChart3 className="w-7 h-7 text-clay" /> Analytics</h1>
          <p className="text-ink2 text-sm mt-1">PrintCraft store performance</p>
        </div>
        <button onClick={() => load(pwd)} className="flex items-center gap-2 text-sm text-ink2 hover:text-ink border border-ink/15 rounded-xl px-4 py-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* All-time stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Page Views', value: data.totals.pageViews, icon: Eye, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Product Views', value: data.totals.productViews, icon: Package, color: 'text-sage-dark', bg: 'bg-sage/15' },
          { label: 'Add to Cart', value: data.totals.cartAdds, icon: ShoppingCart, color: 'text-clay', bg: 'bg-butter/40' },
          { label: 'Checkouts', value: data.totals.checkoutsStarted, icon: TrendingUp, color: 'text-yellow-500', bg: 'bg-yellow-50' },
          { label: 'Orders', value: data.totals.ordersCompleted, icon: ShoppingCart, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Quotes', value: data.totals.quotesSubmitted, icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-ink/10 shadow-sm p-5">
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
            <div className="text-xs text-ink2 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Last 7 days + Conversion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6">
          <h3 className="font-bold text-ink mb-4">Last 7 Days</h3>
          <div className="space-y-3">
            {[
              { label: 'Page Views', value: data.last7Days.pageViews, max: Math.max(data.last7Days.pageViews, 1), color: 'bg-blue-400' },
              { label: 'Add to Cart', value: data.last7Days.cartAdds, max: Math.max(data.last7Days.pageViews, 1), color: 'bg-craft-orange' },
              { label: 'Orders', value: data.last7Days.orders, max: Math.max(data.last7Days.pageViews, 1), color: 'bg-green-400' },
              { label: 'Quotes', value: data.last7Days.quotes, max: Math.max(data.last7Days.pageViews, 1), color: 'bg-indigo-400' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink2">{row.label}</span>
                  <span className="font-semibold">{row.value}</span>
                </div>
                <div className="h-2 bg-paper2 rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${Math.min((row.value / row.max) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6">
          <h3 className="font-bold text-ink mb-4">Conversion Funnel</h3>
          <div className="space-y-3">
            {[
              { label: 'Visited site', value: data.totals.pageViews, pct: 100 },
              { label: 'Viewed a product', value: data.totals.productViews, pct: data.totals.pageViews > 0 ? Math.min(100, Math.round((data.totals.productViews / data.totals.pageViews) * 100)) : 0 },
              { label: 'Added to cart', value: data.totals.cartAdds, pct: data.totals.productViews > 0 ? Math.min(100, Math.round((data.totals.cartAdds / data.totals.productViews) * 100)) : 0 },
              { label: 'Started checkout', value: data.totals.checkoutsStarted, pct: data.totals.cartAdds > 0 ? Math.min(100, Math.round((data.totals.checkoutsStarted / data.totals.cartAdds) * 100)) : 0 },
              { label: 'Completed order', value: data.totals.ordersCompleted, pct: data.totals.checkoutsStarted > 0 ? Math.min(100, Math.round((data.totals.ordersCompleted / data.totals.checkoutsStarted) * 100)) : 0 },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-butter text-clay-dark text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-ink2">{step.label}</span>
                    <span className="font-semibold">{step.value} <span className="text-ink2/70 font-normal">({step.pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-paper2 rounded-full overflow-hidden">
                    <div className="h-full bg-craft-orange rounded-full" style={{ width: `${step.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink2/70 mt-4">Overall cart-to-order rate: <strong className="text-ink2">{convRate}%</strong></p>
        </div>
      </div>

      {/* Daily page views chart */}
      <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6 mb-8">
        <h3 className="font-bold text-ink mb-6">Page Views — Last 14 Days</h3>
        <div className="flex items-end gap-1 h-32">
          {data.dailyViews.map(d => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
              <div
                className="w-full bg-craft-orange/40 hover:bg-craft-orange rounded-t transition-colors relative"
                style={{ height: `${(d.count / maxDailyViews) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                title={`${d.count} views`}
              />
              <span className="text-xs text-ink2/70 hidden sm:block" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '36px', fontSize: '10px' }}>
                {d.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6">
          <h3 className="font-bold text-ink mb-4">Top Products</h3>
          {data.topProducts.length === 0 ? (
            <p className="text-ink2/70 text-sm">No product views yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-ink2/70 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-ink2/70">{p.views} views · {p.cartAdds} cart adds</p>
                  </div>
                  <span className="text-xs bg-butter/40 text-clay-dark px-2 py-1 rounded-full font-medium">{p.views}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6">
          <h3 className="font-bold text-ink mb-4">Recent Activity</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.recentEvents.slice(0, 20).map(evt => {
              const icons: Record<string, string> = {
                page_view: '👁️', product_viewed: '📦', add_to_cart: '🛒',
                checkout_started: '💳', order_completed: '✅', quote_submitted: '📐',
              };
              return (
                <div key={evt.id} className="flex items-center gap-2 text-xs">
                  <span>{icons[evt.type] || '•'}</span>
                  <span className="text-ink2 capitalize">{evt.type.replace(/_/g, ' ')}</span>
                  {evt.data.productName && <span className="text-ink2/70 truncate max-w-24">— {String(evt.data.productName)}</span>}
                  <span className="ml-auto text-ink2/40 flex-shrink-0">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                </div>
              );
            })}
            {data.recentEvents.length === 0 && <p className="text-ink2/70 text-sm">No events yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
