'use client';
import { useCart, CartItem, getItemUnitPrice } from '@/context/CartContext';
import { useSession } from 'next-auth/react';
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
  if (item.customizations?.name) {
    parts.push(`"${item.customizations.name}"`);
  }
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
  const { data: session } = useSession();
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

  // Pre-fill from the signed-in account so the order lands in their history
  useEffect(() => {
    if (session?.user) {
      setName(prev => prev || session.user?.name || '');
      setEmail(prev => prev || session.user?.email || '');
    }
  }, [session]);

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
          items: items.map(i => ({ productName: buildItemName(i), price: getItemUnitPrice(i), quantity: i.quantity })),
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
          <div className="w-20 h-20 bg-butter/50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📋</span>
          </div>
          <h2 className="font-display text-[28px] mb-3 text-ink">Order received!</h2>
          <p className="text-ink2 mb-2">Your order <code className="bg-paper2 px-3 py-1 rounded-lg text-sm font-mono">{pendingOrder}</code> has been saved.</p>
          <p className="text-ink2/80 text-sm mb-8">Online payments are coming soon. We&apos;ll reach out to arrange payment and confirm your order.</p>
          <Link href="/shop" className="btn-clay">Continue shopping</Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-paper2 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-10 h-10 text-ink2/40" />
          </div>
          <h2 className="font-display text-[28px] mb-3 text-ink">Your basket is empty</h2>
          <p className="text-ink2 mb-8">Pop over to the shelf and pick something up.</p>
          <Link href="/shop" className="btn-clay">Browse the shelf</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/shop" className="inline-flex items-center gap-2 text-ink2 hover:text-clay-dark text-sm font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Continue shopping
        </Link>
        <h1 className="font-display text-[clamp(32px,4vw,44px)] mb-8 text-ink">Your basket</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const { product, quantity, customizations, cartKey } = item;
              const unitPrice = getItemUnitPrice(item);
              return (
                <div key={cartKey} className="bg-white rounded-[18px] p-5 flex gap-4 shadow-[0_3px_0_rgba(61,47,36,.12),0_10px_24px_rgba(61,47,36,.08)]">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative bg-paper2">
                    <Image src={product.image} alt={product.name} fill className="object-cover" sizes="80px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-ink truncate">{product.name}</h3>
                    {customizations?.name && (
                      <p className="text-xs text-clay-dark font-semibold mt-0.5 truncate">Name: &ldquo;{customizations.name}&rdquo;</p>
                    )}
                    {/* Customization details */}
                    {customizations?.color && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-3 h-3 rounded-full border border-ink/20 flex-shrink-0"
                          style={{ backgroundColor: customizations.color.hex }}
                        />
                        <span className="text-xs text-ink2">
                          {customizations.color.name}
                        </span>
                      </div>
                    )}
                    {customizations?.variant && (
                      <p className="text-xs text-ink2/80 mt-0.5">
                        {customizations.variant === 'with-divider' ? 'With Divider' : 'No Divider'}
                      </p>
                    )}
                    {customizations?.customDimensions && (
                      <p className="text-xs text-ink2/80 mt-0.5">
                        {customizations.customDimensions.length}&quot;×{customizations.customDimensions.width}&quot;×{customizations.customDimensions.height}&quot; custom size
                      </p>
                    )}
                    <p className="text-ink2/80 text-xs mt-0.5">{product.leadTime} lead time · {product.materials[0]}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <button onClick={() => updateQuantity(cartKey, quantity - 1)} className="w-8 h-8 rounded-lg bg-paper2 flex items-center justify-center hover:bg-butter transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="font-bold w-6 text-center text-sm">{quantity}</span>
                      <button onClick={() => updateQuantity(cartKey, quantity + 1)} className="w-8 h-8 rounded-lg bg-paper2 flex items-center justify-center hover:bg-butter transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeItem(cartKey)} className="ml-auto text-clay hover:text-[#b3402a] transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-lg text-clay">${(unitPrice * quantity).toFixed(2)}</p>
                    <p className="text-xs text-ink2/80">${unitPrice.toFixed(2)} each</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-[18px] p-6 shadow-[0_3px_0_rgba(61,47,36,.12),0_10px_24px_rgba(61,47,36,.08)] sticky top-24">
              <h3 className="font-display text-[22px] mb-5 text-ink">Order summary</h3>
              <div className="flex justify-between text-sm mb-2"><span className="text-ink2">Subtotal</span><span className="font-semibold">${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-ink2">Shipping</span>
                {shippingLoading ? (
                  <span className="text-ink2/70 text-xs">Calculating...</span>
                ) : shipping ? (
                  <span className="font-semibold">${shipping.cost.toFixed(2)}</span>
                ) : (
                  <span className="text-ink2/70 text-xs">Enter zip below</span>
                )}
              </div>
              {shipping && (
                <div className="flex items-start gap-1.5 text-xs text-ink2/80 mb-2">
                  <Truck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{shipping.label} · {shipping.estimatedDays}</span>
                </div>
              )}
              {shippingError && <p className="text-[#b3402a] text-xs mb-2">{shippingError}</p>}
              <div className="border-t border-dashed border-ink/25 my-4" />
              <div className="flex justify-between font-extrabold text-xl mb-6">
                <span>Total</span>
                <span>${grandTotal.toFixed(2)}</span>
              </div>

              <form onSubmit={handleCheckout} className="space-y-3">
                <input required type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
                  className="craft-input text-sm" />
                <input required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
                  className="craft-input text-sm" />
                <input required type="text" placeholder="Street address" value={address} onChange={e => setAddress(e.target.value)}
                  className="craft-input text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input required type="text" placeholder="City" value={city} onChange={e => setCity(e.target.value)}
                    className="craft-input text-sm" />
                  <select required value={state} onChange={e => setState(e.target.value)}
                    className="craft-input text-sm">
                    <option value="">State</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <input required type="text" placeholder="ZIP code" value={zip} onChange={e => setZip(e.target.value)} maxLength={10}
                  className="craft-input text-sm" />
                <input type="text" placeholder="Coupon code (optional)" value={coupon} onChange={e => setCoupon(e.target.value)}
                  className="craft-input text-sm" />
                {error && <p className="text-[#b3402a] text-xs bg-craft-orange/15 p-3 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading || !shipping}
                  className="btn-clay w-full">
                  <CreditCard className="w-4 h-4" />
                  {loading ? 'Processing...' : 'Place order'}
                </button>
                <div className="flex items-center justify-center gap-1.5 text-xs text-ink2/80 pt-1">
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
