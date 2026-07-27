'use client';

import Link from 'next/link';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OrderSuccess() {
  const [verifying, setVerifying] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const squareOrderId = sessionStorage.getItem('squareOrderId');
    if (!squareOrderId) {
      setVerifying(false);
      return;
    }
    sessionStorage.removeItem('squareOrderId');

    fetch('/api/verify-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ squareOrderId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.orderId) setOrderId(data.orderId);
      })
      .catch(() => {})
      .finally(() => setVerifying(false));
  }, []);

  if (verifying) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-clay animate-spin mx-auto mb-4" />
          <p className="text-ink2">Confirming your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-24 h-24 bg-butter/50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <span className="text-[44px] text-craft-orange craft-spin !animate-[craft-spin_8s_linear_infinite]">✳︎</span>
        </div>
        <h1 className="font-display text-[clamp(30px,4vw,40px)] text-ink mb-3">Order confirmed!</h1>
        {orderId && (
          <p className="text-ink2 mb-2">Order <code className="bg-paper2 px-3 py-1 rounded-lg text-sm font-mono">{orderId}</code></p>
        )}
        <p className="text-ink2 mb-2 leading-relaxed">Payment received. A printer is warming up with your name on the queue.</p>
        <p className="text-ink2/80 text-sm mb-10">You&apos;ll receive an email confirmation with your order details and tracking info once shipped.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/shop" className="btn-clay">Continue shopping</Link>
          <Link href="/" className="btn-line">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
