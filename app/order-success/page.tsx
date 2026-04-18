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
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Confirming your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-12 h-12 text-emerald-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Order Confirmed!</h1>
        {orderId && (
          <p className="text-gray-500 mb-2">Order <code className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-mono">{orderId}</code></p>
        )}
        <p className="text-gray-500 mb-2 leading-relaxed">Payment received. We&apos;ll start printing your order right away.</p>
        <p className="text-gray-400 text-sm mb-10">You&apos;ll receive an email confirmation with your order details and tracking info once shipped.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/shop" className="bg-gradient-to-r from-purple-500 to-purple-400 text-white px-8 py-3.5 rounded-xl font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all">Continue Shopping</Link>
          <Link href="/" className="ring-2 ring-gray-200 hover:ring-gray-300 text-gray-700 px-8 py-3.5 rounded-xl font-bold transition-all">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
