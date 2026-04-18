'use client';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { User, Package, Heart, LogOut, Save, Loader2 } from 'lucide-react';
import { products } from '@/lib/products';
import type { UserProfile } from '@/lib/users';
import type { Order } from '@/lib/orders';

type Tab = 'profile' | 'orders' | 'watchlist';

export default function AccountPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>('profile');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(data => {
        setUser(data.user);
        setOrders(data.orders || []);
        setWatchlist(data.user?.watchlist || []);
        setFormData({
          name: data.user?.name || session?.user?.name || '',
          phone: data.user?.phone || '',
          address: data.user?.address || '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    const res = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (data.user) setUser(data.user);
    setSaving(false);
  };

  const removeFromWatchlist = async (productId: string) => {
    const res = await fetch('/api/user/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    });
    const data = await res.json();
    setWatchlist(data.watchlist);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <Package className="w-4 h-4" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Heart className="w-4 h-4" /> },
  ];

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {session?.user?.image ? (
              <Image src={session.user.image} alt="" width={48} height={48} className="rounded-full ring-2 ring-purple-500/50" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white text-lg font-bold">
                {session?.user?.name?.[0]?.toUpperCase() || '?'}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">{session?.user?.name}</h1>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <div className="flex gap-1 mb-8 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-purple-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t.icon} {t.label}
              {t.id === 'orders' && orders.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-purple-400' : 'bg-gray-100'}`}>{orders.length}</span>
              )}
              {t.id === 'watchlist' && watchlist.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-purple-400' : 'bg-gray-100'}`}>{watchlist.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="font-bold text-lg mb-6 text-gray-900">Profile Information</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={session?.user?.email || ''}
                  disabled
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Optional"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                  placeholder="Optional — for faster checkout"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-1">No orders yet</h3>
                <p className="text-gray-500 text-sm mb-6">Your order history will appear here.</p>
                <Link href="/#shop" className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all inline-block">
                  Browse Products
                </Link>
              </div>
            ) : (
              orders.map((order: Order) => (
                <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Order #{order.id}</p>
                      <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                      order.status === 'shipped' ? 'bg-blue-50 text-blue-600' :
                      order.status === 'confirmed' ? 'bg-purple-50 text-purple-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  {order.items && (
                    <div className="space-y-1.5">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.productName} x{item.quantity}</span>
                          <span className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {order.totalAmount && (
                    <div className="flex justify-between mt-3 pt-3 border-t border-gray-100 font-bold text-sm">
                      <span>Total</span>
                      <span>${order.totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'watchlist' && (
          <div>
            {watchlist.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-bold text-gray-900 mb-1">Your watchlist is empty</h3>
                <p className="text-gray-500 text-sm mb-6">Click the heart icon on products to save them here.</p>
                <Link href="/#shop" className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all inline-block">
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {watchlist.map(productId => {
                  const product = products.find(p => p.id === productId);
                  if (!product) return null;
                  return (
                    <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-100">
                        <Image src={product.image} alt={product.name} fill className="object-cover" sizes="80px" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{product.name}</h3>
                        <p className="text-lg font-extrabold text-gray-900 mt-1">${product.price.toFixed(2)}</p>
                        <div className="flex gap-2 mt-2">
                          <Link href="/#shop" className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-purple-600 transition-colors">
                            View
                          </Link>
                          <button
                            onClick={() => removeFromWatchlist(product.id)}
                            className="text-xs text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
