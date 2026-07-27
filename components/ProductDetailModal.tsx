'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Ruler, Tag, Plus, Minus } from 'lucide-react';
import { Product, FilamentColor, BAG_CHARM_MAX_NAME_LENGTH, getBagCharmPrice } from '@/lib/products';
import { useCart, CartItemCustomization } from '@/context/CartContext';
import { trackEvent } from '@/lib/useAnalytics';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const { addItem } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  // Customization state
  const [selectedColor, setSelectedColor] = useState<FilamentColor | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<'without-divider' | 'with-divider'>('without-divider');
  const [customSizeEnabled, setCustomSizeEnabled] = useState(false);
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });
  const [names, setNames] = useState<string[]>(['']);

  const images = product?.images?.length ? product.images : product ? [product.image] : [];
  // Deduplicate colors by name (keep first occurrence — brand is internal only)
  const uniqueColors = product?.colors?.filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i) ?? [];
  const hasCustomizations = !!(product?.colors || product?.hasDividerOption || product?.hasCustomSize || product?.hasNameInput);

  // Reset state when product changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setAddedToCart(false);
    setSelectedColor(null);
    setSelectedVariant('without-divider');
    setCustomSizeEnabled(false);
    setDimensions({ length: '', width: '', height: '' });
    setNames(['']);
  }, [product?.id]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (product) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [product]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!product) return;
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') setSelectedImageIndex(i => (i > 0 ? i - 1 : images.length - 1));
    if (e.key === 'ArrowRight') setSelectedImageIndex(i => (i < images.length - 1 ? i + 1 : 0));
  }, [product, onClose, images.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const trimmedNames = names.map(n => n.trim());
  const validNames = trimmedNames.filter(n => n.length > 0 && n.length <= BAG_CHARM_MAX_NAME_LENGTH);
  const namesAllValid = product?.hasNameInput
    ? trimmedNames.every(n => n.length >= 1 && n.length <= BAG_CHARM_MAX_NAME_LENGTH) && validNames.length === trimmedNames.length
    : true;
  const namesTotal = product?.hasNameInput
    ? validNames.reduce((sum, n) => sum + getBagCharmPrice(n), 0)
    : 0;

  const canAddToCart =
    (!product?.colors || selectedColor !== null) &&
    (!product?.hasNameInput || (validNames.length > 0 && namesAllValid));

  const handleAddToCart = () => {
    if (!product || !canAddToCart) return;

    if (product.hasNameInput) {
      // One cart entry per name so each gets its own tier-based unit price.
      validNames.forEach(name => {
        addItem(product, { name });
      });
      trackEvent('add_to_cart', { productId: product.id, productName: product.name, price: namesTotal });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
      return;
    }

    let customizations: CartItemCustomization | undefined;
    if (hasCustomizations) {
      customizations = {};
      if (selectedColor) customizations.color = selectedColor;
      if (product.hasDividerOption) customizations.variant = selectedVariant;
      if (product.hasCustomSize && customSizeEnabled) {
        const l = parseFloat(dimensions.length);
        const w = parseFloat(dimensions.width);
        const h = parseFloat(dimensions.height);
        if (l > 0 && w > 0 && h > 0) {
          customizations.customDimensions = { length: l, width: w, height: h };
        }
      }
    }

    addItem(product, customizations);
    trackEvent('add_to_cart', { productId: product.id, productName: product.name, price: product.price });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const updateName = (idx: number, value: string) => {
    setNames(prev => prev.map((n, i) => (i === idx ? value : n)));
  };
  const addNameRow = () => setNames(prev => [...prev, '']);
  const removeNameRow = (idx: number) => {
    setNames(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const prevImage = () => setSelectedImageIndex(i => (i > 0 ? i - 1 : images.length - 1));
  const nextImage = () => setSelectedImageIndex(i => (i < images.length - 1 ? i + 1 : 0));

  const optLabelCls = 'text-[12.5px] font-bold uppercase tracking-[.1em] text-ink mb-2.5 flex items-center gap-1.5';

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-ink/55 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 26 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-paper rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,.35)] w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 z-10 w-[38px] h-[38px] rounded-full bg-white border-2 border-ink flex items-center justify-center text-ink transition-transform hover:rotate-90"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col md:flex-row">
              {/* Image Gallery */}
              <div className="md:w-1/2 p-6 sm:p-7">
                {/* Main image — tilted photo print */}
                <div className="relative bg-white p-2.5 pb-3.5 rounded-md shadow-[0_8px_24px_rgba(61,47,36,.14)] -rotate-1">
                  <div className="relative aspect-square overflow-hidden rounded-[3px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedImageIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={images[selectedImageIndex]}
                          alt={`${product.name} - Image ${selectedImageIndex + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Navigation arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        aria-label="Previous image"
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-2 border-ink flex items-center justify-center text-ink hover:bg-butter transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={nextImage}
                        aria-label="Next image"
                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border-2 border-ink flex items-center justify-center text-ink hover:bg-butter transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Image counter */}
                  {images.length > 1 && (
                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-ink/60 backdrop-blur-sm text-paper text-xs px-3 py-1 rounded-full">
                      {selectedImageIndex + 1} / {images.length}
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2.5 mt-4.5 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-[3px] transition-all ${
                          idx === selectedImageIndex
                            ? 'border-craft-orange -rotate-2'
                            : 'border-transparent opacity-55 hover:opacity-100'
                        }`}
                      >
                        <Image
                          src={img}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="md:w-1/2 p-5 sm:p-6 md:py-8 md:pr-8 md:pl-2 flex flex-col">
                {/* Category */}
                <span className="kicker !text-[12px] mb-2">
                  {product.category.replace('-', ' ')}
                </span>

                {/* Name */}
                <h2 className="font-display text-[29px] text-ink mb-2 leading-[1.1]">
                  {product.name}
                </h2>

                {/* Price */}
                <div className="font-display text-[26px] text-clay mb-3">
                  {product.hasNameInput ? (
                    <>
                      {validNames.length > 0 ? `$${namesTotal.toFixed(2)}` : '$8 – $10'}
                      <span className="font-sans text-[13px] font-medium text-ink2 ml-2">
                        {validNames.length > 0 ? `${validNames.length} charm${validNames.length === 1 ? '' : 's'}` : 'per charm'}
                      </span>
                    </>
                  ) : (
                    <>
                      ${product.price.toFixed(2)}
                      {product.hasCustomSize && (
                        <span className="font-sans text-[13px] font-medium text-ink2 ml-2">standard size</span>
                      )}
                    </>
                  )}
                </div>

                {/* Description */}
                <p className="text-ink2 text-[14.5px] leading-relaxed mb-5">
                  {product.description}
                </p>

                {/* ── Name Inputs (Bag Charm) ── */}
                {product.hasNameInput && (
                  <div className="mb-5">
                    <h3 className={optLabelCls}>
                      <Tag className="w-4 h-4 text-clay" />
                      Names
                      <em className="hand-note !text-ink2 normal-case tracking-normal text-sm font-normal not-italic ml-1" style={{ fontStyle: 'italic' }}>
                        1–{BAG_CHARM_MAX_NAME_LENGTH} characters each
                      </em>
                    </h3>
                    <div className="space-y-2">
                      {names.map((n, idx) => {
                        const trimmed = n.trim();
                        const tooLong = trimmed.length > BAG_CHARM_MAX_NAME_LENGTH;
                        const price = trimmed.length > 0 && !tooLong ? getBagCharmPrice(trimmed) : null;
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="flex-1 relative">
                              <input
                                type="text"
                                value={n}
                                onChange={e => updateName(idx, e.target.value)}
                                maxLength={BAG_CHARM_MAX_NAME_LENGTH}
                                placeholder={`Name ${idx + 1}`}
                                className={`craft-input !py-2.5 !pr-11 text-sm ${
                                  tooLong ? '!border-[#b3402a] !bg-[#b3402a]/5' : ''
                                }`}
                              />
                              {price !== null && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-clay">
                                  ${price}
                                </span>
                              )}
                            </div>
                            {names.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeNameRow(idx)}
                                aria-label={`Remove name ${idx + 1}`}
                                className="w-8 h-8 rounded-lg bg-paper2 hover:bg-butter flex items-center justify-center text-ink2"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={addNameRow}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-bold text-clay hover:text-clay-dark"
                    >
                      <Plus className="w-4 h-4" /> Add another name
                    </button>
                    <p className="text-[12.5px] text-clay-dark mt-2.5 bg-craft-orange/15 px-3 py-2 rounded-[10px] leading-normal">
                      $8 for names up to 5 letters · $10 for 6–{BAG_CHARM_MAX_NAME_LENGTH} letters · max {BAG_CHARM_MAX_NAME_LENGTH} characters per name
                    </p>
                  </div>
                )}

                {/* ── Color Picker ── */}
                {uniqueColors.length > 0 && (
                  <div className="mb-5">
                    <h3 className={optLabelCls}>
                      Color
                      {selectedColor
                        ? <em className="hand-note !text-ink2 normal-case tracking-normal text-sm font-normal ml-1" style={{ fontStyle: 'italic' }}>{selectedColor.name}</em>
                        : <em className="normal-case tracking-normal text-sm font-normal ml-1 text-[#b3402a]" style={{ fontFamily: 'var(--font-serif-italic)', fontStyle: 'italic' }}>— pick one</em>
                      }
                    </h3>
                    <div className="flex flex-wrap gap-2.5">
                      {uniqueColors.map((color) => {
                        const isSelected = selectedColor?.name === color.name;
                        return (
                          <button
                            key={color.name}
                            title={color.name}
                            onClick={() => setSelectedColor(color)}
                            className={`w-8 h-8 rounded-full border-[2.5px] border-white shadow-[0_2px_6px_rgba(61,47,36,.25)] transition-transform hover:scale-115 ${
                              isSelected ? 'outline-[3px] outline outline-craft-orange outline-offset-2 scale-112' : ''
                            }`}
                            style={{ backgroundColor: color.hex }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Divider Option ── */}
                {product.hasDividerOption && (
                  <div className="mb-5">
                    <h3 className={optLabelCls}>Divider</h3>
                    <div className="inline-flex border-2 border-dashed border-clay rounded-xl overflow-hidden text-[13.5px] font-bold w-fit">
                      <button
                        onClick={() => setSelectedVariant('without-divider')}
                        className={`px-4 py-2.5 transition-colors ${
                          selectedVariant === 'without-divider'
                            ? 'bg-clay text-white'
                            : 'text-clay-dark hover:bg-clay/10'
                        }`}
                      >
                        Without Divider
                      </button>
                      <button
                        onClick={() => setSelectedVariant('with-divider')}
                        className={`px-4 py-2.5 transition-colors ${
                          selectedVariant === 'with-divider'
                            ? 'bg-clay text-white'
                            : 'text-clay-dark hover:bg-clay/10'
                        }`}
                      >
                        With Divider
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Custom Size ── */}
                {product.hasCustomSize && (
                  <div className="mb-5">
                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                      <input
                        type="checkbox"
                        checked={customSizeEnabled}
                        onChange={e => setCustomSizeEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-clay"
                      />
                      <span className="text-sm font-bold text-ink flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-clay" />
                        Custom Size
                      </span>
                      {!customSizeEnabled && (
                        <span className="text-xs text-ink2">(standard: 4″×3″×2″)</span>
                      )}
                    </label>
                    {customSizeEnabled && (
                      <div className="flex gap-2.5 mt-1">
                        {(['length', 'width', 'height'] as const).map(dim => (
                          <div key={dim} className="flex-1">
                            <label className="block text-[11.5px] text-ink2 font-bold mb-1 capitalize">{dim} (in)</label>
                            <input
                              type="number"
                              min="1"
                              max="24"
                              step="0.5"
                              placeholder="0"
                              value={dimensions[dim]}
                              onChange={e => setDimensions(prev => ({ ...prev, [dim]: e.target.value }))}
                              className="craft-input !px-2 !py-2 text-sm text-center"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {customSizeEnabled && (
                      <p className="text-[12.5px] text-clay-dark mt-2.5 bg-craft-orange/15 px-3 py-2 rounded-[10px] leading-normal">
                        Custom sizes may vary in price — we&apos;ll confirm before processing.
                      </p>
                    )}
                  </div>
                )}

                {/* Features */}
                <div className="mb-4.5">
                  <ul className="space-y-1.5">
                    {product.features.map((f) => (
                      <li key={f} className="relative pl-5 text-sm text-ink2 leading-[1.55]">
                        <span className="absolute left-0 text-craft-orange text-xs">✳︎</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-4.5 text-xs text-sage-dark font-bold uppercase tracking-[.08em] mb-5">
                  <span>⏱ {product.leadTime}</span>
                  <span>{product.materials.join(', ')}</span>
                  <span className={product.inStock ? 'text-sage-dark' : 'text-[#b3402a]'}>
                    {product.inStock ? '● In stock' : '● Out of stock'}
                  </span>
                </div>

                {/* Add to Cart */}
                <div className="mt-auto pt-4 border-t border-dashed border-ink/25">
                  {product.colors && !selectedColor && (
                    <p className="text-[12.5px] text-[#b3402a] mb-2 text-center">Pick a color to continue</p>
                  )}
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock || !canAddToCart}
                    className={`w-full ${addedToCart ? 'btn-clay !bg-sage !shadow-[0_6px_0_var(--color-sage-dark)]' : 'btn-clay'}`}
                  >
                    {addedToCart ? 'Added to your basket! ✳︎' : 'Add to basket'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
