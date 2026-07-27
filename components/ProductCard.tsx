'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Product } from '@/lib/products';
import { useCart } from '@/context/CartContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { trackEvent } from '@/lib/useAnalytics';

export default function ProductCard({ product, onSelect }: { product: Product; onSelect?: (product: Product) => void }) {
  const { addItem } = useCart();
  const images = product.images?.length ? product.images : [product.image];
  const [imgIndex, setImgIndex] = useState(0);

  const requiresModal = !!(product.colors || product.hasNameInput);

  const handleAddToCart = () => {
    if (requiresModal) {
      handleView();
      return;
    }
    addItem(product);
    trackEvent('add_to_cart', { productId: product.id, productName: product.name, price: product.price });
  };

  const handleView = () => {
    trackEvent('product_viewed', { productId: product.id, productName: product.name, category: product.category });
    onSelect?.(product);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex(i => (i > 0 ? i - 1 : images.length - 1));
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setImgIndex(i => (i < images.length - 1 ? i + 1 : 0));
  };

  return (
    <div className="craft-card group relative p-3.5 pb-5 cursor-pointer" onClick={handleView}>
      <span className="price-tag">
        {product.hasNameInput ? '$8–$10' : `$${product.price.toFixed(2)}`}
      </span>
      <div className="aspect-square relative overflow-hidden rounded-xl bg-paper2">
        <Image
          src={images[imgIndex]}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Arrow navigation — only when multiple images */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-ink flex items-center justify-center text-ink opacity-0 group-hover:opacity-100 transition-opacity hover:bg-butter"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-ink flex items-center justify-center text-ink opacity-0 group-hover:opacity-100 transition-opacity hover:bg-butter"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {/* Dot indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {images.map((_, i) => (
                <span key={i} onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === imgIndex ? 'bg-white scale-125' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <h3 className="font-display text-[21px] text-ink mt-4.5 mb-1.5 mx-1.5 leading-tight">{product.name}</h3>
      <p className="text-ink2 text-[14.5px] mx-1.5 mb-3.5 line-clamp-2 leading-[1.55]">{product.description}</p>

      <div className="flex items-center gap-2 mx-1.5 mb-4 text-[12.5px] text-sage-dark font-bold uppercase tracking-[.08em]">
        <span>⏱ {product.leadTime}</span>
        <span className="w-1 h-1 rounded-full bg-sage-dark/40" />
        <span>{product.materials.join(' / ')}</span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
        className="btn-basket w-[calc(100%-12px)] mx-1.5"
      >
        Add to basket
      </button>
    </div>
  );
}
