'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/products';
import ProductCard from '@/components/ProductCard';
import ProductDetailModal from '@/components/ProductDetailModal';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function ShopSection({ products }: { products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {products.map(p => (
          <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} />
        ))}

        {/* Custom Swag CTA Card */}
        <Link href="/custom-swag" className="group relative bg-gradient-to-br from-purple-600 to-purple-500 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl hover:shadow-purple-500/20 transition-all flex flex-col items-center justify-center text-center p-8 min-h-[360px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent" />
          <div className="relative">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">Custom Swag</h3>
            <p className="text-purple-100 text-sm mb-6 leading-relaxed">Design your own magnets, keychains & NFC badges with your image</p>
            <span className="inline-flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-xl font-bold text-sm group-hover:bg-white/30 transition-colors">
              Design Yours <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <p className="text-purple-200 text-xs mt-3 font-medium">From $5.00</p>
          </div>
        </Link>
      </div>

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
