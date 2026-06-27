'use client';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, Clock, ChevronLeft, ChevronRight, Package, Ruler, Tag, Plus, Minus } from 'lucide-react';
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-white transition-all shadow-md"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col md:flex-row">
              {/* Image Gallery */}
              <div className="md:w-1/2 p-4 sm:p-6">
                {/* Main image */}
                <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-stone-100">
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

                  {/* Navigation arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-stone-700 hover:bg-white transition-all shadow-md"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-stone-700 hover:bg-white transition-all shadow-md"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {/* Image counter */}
                  {images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                      {selectedImageIndex + 1} / {images.length}
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                          idx === selectedImageIndex
                            ? 'ring-2 ring-amber-600 ring-offset-2'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        <Image
                          src={img}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="md:w-1/2 p-5 sm:p-6 md:py-8 md:pr-8 md:pl-2 flex flex-col">
                {/* Category */}
                <span className="inline-block text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full w-fit mb-3">
                  {product.category.replace('-', ' ')}
                </span>

                {/* Name */}
                <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3 leading-tight">
                  {product.name}
                </h2>

                {/* Price */}
                <div className="text-3xl font-extrabold text-stone-900 mb-4">
                  {product.hasNameInput ? (
                    <>
                      {validNames.length > 0 ? `$${namesTotal.toFixed(2)}` : '$8 – $10'}
                      <span className="text-sm font-normal text-stone-400 ml-2">
                        {validNames.length > 0 ? `${validNames.length} charm${validNames.length === 1 ? '' : 's'}` : 'per charm'}
                      </span>
                    </>
                  ) : (
                    <>
                      ${product.price.toFixed(2)}
                      {product.hasCustomSize && (
                        <span className="text-sm font-normal text-stone-400 ml-2">standard size</span>
                      )}
                    </>
                  )}
                </div>

                {/* Description */}
                <p className="text-stone-600 leading-relaxed mb-5">
                  {product.description}
                </p>

                {/* ── Name Inputs (Bag Charm) ── */}
                {product.hasNameInput && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-stone-900 mb-2 flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-amber-700" />
                      Names
                      <span className="ml-1 font-normal text-stone-400 text-xs">
                        (1–{BAG_CHARM_MAX_NAME_LENGTH} characters each)
                      </span>
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
                                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                                  tooLong ? 'border-red-300 bg-red-50' : 'border-stone-200'
                                }`}
                              />
                              {price !== null && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-700">
                                  ${price}
                                </span>
                              )}
                            </div>
                            {names.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeNameRow(idx)}
                                aria-label={`Remove name ${idx + 1}`}
                                className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500"
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
                      className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-800"
                    >
                      <Plus className="w-4 h-4" /> Add another name
                    </button>
                    <p className="text-xs text-stone-500 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
                      $8 for names up to 5 letters · $10 for 6–{BAG_CHARM_MAX_NAME_LENGTH} letters · max {BAG_CHARM_MAX_NAME_LENGTH} characters per name
                    </p>
                  </div>
                )}

                {/* ── Color Picker ── */}
                {uniqueColors.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-sm font-semibold text-stone-900 mb-2">
                      Color
                      {selectedColor
                        ? <span className="ml-2 font-normal text-stone-500">{selectedColor.name}</span>
                        : <span className="ml-2 font-normal text-red-400">— select one</span>
                      }
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {uniqueColors.map((color) => {
                        const isSelected = selectedColor?.name === color.name;
                        return (
                          <button
                            key={color.name}
                            title={color.name}
                            onClick={() => setSelectedColor(color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                              isSelected
                                ? 'border-amber-600 ring-2 ring-amber-300 ring-offset-1 scale-110'
                                : 'border-stone-200 hover:border-stone-400'
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
                    <h3 className="text-sm font-semibold text-stone-900 mb-2">Divider</h3>
                    <div className="flex rounded-xl overflow-hidden border border-stone-200 text-sm font-medium w-fit">
                      <button
                        onClick={() => setSelectedVariant('without-divider')}
                        className={`px-4 py-2 transition-colors ${
                          selectedVariant === 'without-divider'
                            ? 'bg-amber-700 text-white'
                            : 'text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        Without Divider
                      </button>
                      <button
                        onClick={() => setSelectedVariant('with-divider')}
                        className={`px-4 py-2 transition-colors border-l border-stone-200 ${
                          selectedVariant === 'with-divider'
                            ? 'bg-amber-700 text-white'
                            : 'text-stone-600 hover:bg-stone-50'
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
                        className="w-4 h-4 rounded accent-amber-600"
                      />
                      <span className="text-sm font-semibold text-stone-900 flex items-center gap-1.5">
                        <Ruler className="w-4 h-4 text-amber-700" />
                        Custom Size
                      </span>
                      {!customSizeEnabled && (
                        <span className="text-xs text-stone-400">(standard: 4″×3″×2″)</span>
                      )}
                    </label>
                    {customSizeEnabled && (
                      <div className="flex gap-2 mt-1">
                        {(['length', 'width', 'height'] as const).map(dim => (
                          <div key={dim} className="flex-1">
                            <label className="block text-xs text-stone-500 mb-1 capitalize">{dim} (in)</label>
                            <input
                              type="number"
                              min="1"
                              max="24"
                              step="0.5"
                              placeholder="0"
                              value={dimensions[dim]}
                              onChange={e => setDimensions(prev => ({ ...prev, [dim]: e.target.value }))}
                              className="w-full border border-stone-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {customSizeEnabled && (
                      <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 px-3 py-1.5 rounded-lg">
                        Custom sizes may vary in price — we&apos;ll confirm before processing.
                      </p>
                    )}
                  </div>
                )}

                {/* Features */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-stone-900 mb-2">Features</h3>
                  <ul className="space-y-1.5">
                    {product.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-stone-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap gap-4 text-sm text-stone-500 mb-6">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {product.leadTime}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    {product.materials.join(', ')}
                  </span>
                </div>

                {/* Stock status */}
                <div className="mb-6">
                  {product.inStock ? (
                    <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      In Stock
                    </span>
                  ) : (
                    <span className="text-sm text-red-500 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Out of Stock
                    </span>
                  )}
                </div>

                {/* Add to Cart */}
                <div className="mt-auto pt-4 border-t border-stone-100">
                  {product.colors && !selectedColor && (
                    <p className="text-xs text-red-400 mb-2 text-center">Please select a color to continue</p>
                  )}
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.inStock || !canAddToCart}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-base transition-all active:scale-[0.98] ${
                      addedToCart
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                        : product.inStock && canAddToCart
                          ? 'bg-amber-700 hover:bg-amber-800 text-white shadow-lg shadow-amber-700/25 hover:shadow-xl hover:shadow-amber-700/30'
                          : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {addedToCart ? 'Added!' : 'Add to Cart'}
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
