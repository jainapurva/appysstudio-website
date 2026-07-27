'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/products';
import ProductCard from '@/components/ProductCard';
import ProductDetailModal from '@/components/ProductDetailModal';
import { ArrowRight } from 'lucide-react';

export default function ShopSection({ products }: { products: Product[] }) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-9">
        {products.map(p => (
          <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} />
        ))}

        {/* Custom Swag CTA Card */}
        <Link href="/custom-swag" className="group relative bg-clay rounded-[18px] overflow-hidden shadow-[0_3px_0_rgba(61,47,36,.2),0_10px_24px_rgba(61,47,36,.12)] hover:-translate-y-2 hover:rotate-1 transition-transform duration-300 flex flex-col items-center justify-center text-center p-8 min-h-[360px]">
          <span className="absolute -top-8 -left-6 text-[110px] text-paper/10 craft-spin !animate-[craft-spin_20s_linear_infinite]" aria-hidden="true">✳︎</span>
          <div className="relative">
            <span className="text-5xl block mb-4">🎨</span>
            <h3 className="font-display text-[24px] text-white mb-2">Custom Swag</h3>
            <p className="text-paper/85 text-sm mb-6 leading-relaxed">Design your own magnets, keychains &amp; NFC badges with your image</p>
            <span className="inline-flex items-center gap-2 bg-paper text-clay-dark px-5 py-2.5 rounded-full font-bold text-sm shadow-[0_4px_0_rgba(0,0,0,.2)] group-hover:-translate-y-0.5 transition-transform">
              Design yours <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <p className="hand-note !text-paper/80 text-[15px] mt-3">from $5.00</p>
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
