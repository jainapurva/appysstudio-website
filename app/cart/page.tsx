'use client';
import { useCart, CartItem } from '@/context/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { Truck, Trash2, Plus, Minus, ShoppingBag, CreditCard, Lock, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/useAnalytics';
import { US_STATES } from '@/lib/shipping';

interface ShippingRate {
  cost: number;
  label: string;
  estimatedDays: string;
}

function buildItemName(item: CartItem): string {
  const parts = [item.product.name];
  if (item.customizations?.color) {
    parts.push(item.customizations.color.name);
  }
  if (item.customizations?.variant) {
    parts.push(item.customizations.variant === 'with-divider' ? 'With Divider' : 'No Divider');
  }
  if (item.customizations?.customDimensions) {
    const d = item.customizations.customDimensions;
    parts.push(`${d.length}"×${d.width}"×${d.height}"`);
  }
  return parts.join(' — ');
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [shipping, setShipping] = useState<ShippingRate | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coupon, setCoupon] = useState('');
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);
  const zipDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch shipping rate when zip has 5 digits
  useEffect(() => {
    if (zipDebounce.current) clearTimeout(zipDebounce.current);
    const cleanZip = zip.replace(/\D/g, '');
    if (cleanZip.length < 5) {
      setShipping(null);
      setShippingError('');
      return;
    }
    zipDebounce.current = setTimeout(async () => {
      setShippingLoading(true);
      setShippingError('');
      try {
        const res = await fetch('/api/shipping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipCode: cleanZip,
            items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
          }),
        });
        if (!res.ok) { setShippingError('Could not calculate shipping for this zip code.'); setShipping(null); }
        else setShipping(await res.json());
      } catch {
        setShippingError('Failed to calculate shipping.');
      }
      setShippingLoading(false);
    }, 500);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, items]);

  const grandTotal = total + (shipping?.cost ?? 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !address || !city || !state || !zip) return;
    if (!shipping) { setError('Please enter a valid US zip code to calculate shipping.'); return; }
    setLoading(true);
    setError('');
    trackEvent('checkout_started', { itemCount: items.length, total: grandTotal });
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ productName: buildItemName(i), price: i.product.price, quantity: i.quantity })),
          customerEmail: email,
          customerName: name,
          couponCode: coupon || undefined,
          shippingCost: shipping.cost,
          shippingLabel: shipping.label,
          shippingAddress: { address, city, state, zip },
        }),
      });
      const data = await res.json();
      if (data.url) {
        if (data.orderId) sessionStorage.setItem('squareOrderId', data.orderId);
        window.location.href = data.url;
      } else if (data.paymentPending) {
        clearCart();
        setPendingOrder(data.orderId);
      } else {
        setError('Failed to start checkout. Please try again.');
        setLoading(false);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (pendingOrder) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📋</span>
          </div>
          <h2 className="text-2xl font-extrabold mb-3 text-gray-900">Order Received!</h2>
          <p className="text-gray-500 mb-2">Your order <code className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-mono">{pendingOrder}</code> has been saved.</p>
          <p className="text-gray-400 text-sm mb-8">Online payments are coming soon. We&apos;ll reach out to arrange payment and confirm your order.</p>
          <Link href="/shop" className="bg-gradient-to-r from-purple-500 to-purple-400 text-white px-8 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all inline-block">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-2xl font-extrabold mb-3 text-gray-900">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Add some products to get started.</p>
          <Link href="/shop" className="bg-gradient-to-r from-purple-500 to-purple-400 text-white px-8 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all inline-block">Browse Products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/shop" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Continue shopping
        </Link>
        <h1 className="text-3xl font-extrabold mb-8 text-gray-900">Your Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const { product, quantity, customizations, cartKey } = item;
              return (
                <div key={cartKey} className="bg-white rounded-2xl p-5 flex gap-4 shadow-sm border border-gray-100">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative bg-gray-100">
                    <Image src={product.image} alt={product.name} fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
                    {/* Customization details */}
                    {customizations?.color && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                          style={{ backgroundColor: customizations.color.hex }}
                        />
                        <span className="text-xs text-gray-500">
                          {customizations.color.name}
                        </span>
                      </div>
                    )}
                    {customizations?.variant && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {customizations.variant === 'with-divider' ? 'With Divider' : 'No Divider'}
                      </p>
                    )}
                    {customizations?.customDimensions && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {customizations.customDimensions.length}&quot;×{customizations.customDimensions.width}&quot;×{customizations.customDimensions.height}&quot; custom size
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mt-0.5">{product.leadTime} lead time · {product.materials[0]}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <button onClick={() => updateQuantity(cartKey, quantity - 1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="font-bold w-6 text-center text-sm">{quantity}</span>
                      <button onClick={() => updateQuantity(cartKey, quantity + 1)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeItem(cartKey)} className="ml-auto text-red-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-extrabold text-lg text-gray-900">${(product.price * quantity).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">${product.price.toFixed(2)} each</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-20">
              <h3 className="font-extrabold text-lg mb-5 text-gray-900">Order Summary</h3>
              <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Subtotal</span><span className="font-semibold">${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Shipping</span>
                {shippingLoading ? (
                  <span className="text-gray-400 text-xs">Calculating...</span>
                ) : shipping ? (
                  <span className="font-semibold">${shipping.cost.toFixed(2)}</span>
                ) : (
                  <span className="text-gray-400 text-xs">Enter zip below</span>
                )}
              </div>
              {shipping && (
                <div className="flex items-start gap-1.5 text-xs text-gray-400 mb-2">
                  <Truck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{shipping.label} · {shipping.estimatedDays}</span>
                </div>
              )}
              {shippingError && <p className="text-red-500 text-xs mb-2">{shippingError}</p>}
              <div className="border-t border-gray-100 my-4" />
              <div className="flex justify-between font-extrabold text-xl mb-6">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>

              <form onSubmit={handleCheckout} className="space-y-3">
                <input required type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                <input required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                <input required type="text" placeholder="Street address" value={address} onChange={e => setAddress(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                <div className="grid grid-cols-2 gap-2">
                  <input required type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                  <select required value={state} onChange={e => setState(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all bg-white text-gray-700">
                    <option value="">State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <input required type="text" placeholder="ZIP code" value={zip} onChange={e => setZip(e.target.value)} maxLength={10}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                <input type="text" placeholder="Coupon code (optional)" value={coupon} onChange={e => setCoupon(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all" />
                {error && <p className="text-red-500 text-xs bg-red-50 p-3 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading || !shipping}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-300 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 disabled:shadow-none">
                  <CreditCard className="w-4 h-4" />
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 pt-1">
                  <Lock className="w-3 h-3" /> Secured checkout
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
