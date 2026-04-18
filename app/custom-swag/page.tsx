'use client';

import { useState, useRef, useCallback } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { Upload, X, ShoppingCart, Check, ArrowLeft, Magnet, Key, CreditCard, Sparkles, Send, Loader2 } from 'lucide-react';
import type { Product } from '@/lib/products';

const SWAG_TYPES = [
  { id: 'magnet', name: 'Fridge Magnet', icon: Magnet, description: 'Strong embedded magnets' },
  { id: 'keychain', name: 'Keychain', icon: Key, description: 'Durable & lightweight' },
  { id: 'nfc-badge', name: 'NFC Badge', icon: CreditCard, description: 'Tap to open any URL' },
  { id: 'custom', name: 'Custom', icon: Sparkles, description: 'Tell us what you need' },
] as const;

const SHAPES = [
  { id: 'circle', name: 'Circle' },
  { id: 'rectangle', name: 'Rectangle' },
  { id: 'rounded-rect', name: 'Rounded' },
] as const;

const SIZES = [
  { id: 'small', name: 'Small', label: '2"', px: 120 },
  { id: 'medium', name: 'Medium', label: '3"', px: 160 },
  { id: 'large', name: 'Large', label: '4"', px: 200 },
] as const;

const SWAG_PRICE = 5.00;

type SwagType = typeof SWAG_TYPES[number]['id'];
type Shape = typeof SHAPES[number]['id'];
type Size = typeof SIZES[number]['id'];

function getBorderRadius(shape: Shape) {
  if (shape === 'circle') return '50%';
  if (shape === 'rounded-rect') return '16px';
  return '4px';
}

/* ── Product-specific preview templates ── */

function MagnetPreview({ imageUrl, shape, size }: { imageUrl: string | null; shape: Shape; size: typeof SIZES[number] }) {
  const radius = getBorderRadius(shape);
  return (
    <div className="text-center">
      {/* Magnet body with depth */}
      <div className="relative inline-block" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.2))' }}>
        {/* Back layer for thickness */}
        <div
          className="absolute bg-gray-400"
          style={{
            width: size.px, height: size.px,
            borderRadius: radius,
            top: 6, left: 3,
          }}
        />
        {/* Front face */}
        <div
          className="relative overflow-hidden bg-white border-2 border-gray-300"
          style={{ width: size.px, height: size.px, borderRadius: radius, transition: 'all 0.3s ease' }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <p className="text-gray-400 text-xs px-2">Upload image</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-5 font-medium">{size.label} Fridge Magnet</p>
      <p className="text-xs text-gray-400 mt-1">Strong embedded magnet backing</p>
    </div>
  );
}

function KeychainPreview({ imageUrl, shape, size }: { imageUrl: string | null; shape: Shape; size: typeof SIZES[number] }) {
  const radius = getBorderRadius(shape);
  return (
    <div className="text-center">
      {/* Ring/loop */}
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full border-[3px] border-gray-400 mb-[-4px] relative z-10" />
        <div className="w-[3px] h-3 bg-gray-400 mb-[-2px] relative z-10" />
        {/* Keychain body */}
        <div
          className="relative overflow-hidden bg-white border-2 border-gray-300"
          style={{
            width: size.px, height: size.px, borderRadius: radius,
            transition: 'all 0.3s ease',
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <p className="text-gray-400 text-xs px-2">Upload image</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-5 font-medium">{size.label} Keychain</p>
      <p className="text-xs text-gray-400 mt-1">Metal ring attachment included</p>
    </div>
  );
}

function NfcBadgePreview({ imageUrl, shape, size }: { imageUrl: string | null; shape: Shape; size: typeof SIZES[number] }) {
  const radius = getBorderRadius(shape);
  // Badge is wider than tall
  const width = Math.round(size.px * 1.4);
  const height = size.px;
  return (
    <div className="text-center">
      <div
        className="relative overflow-hidden bg-white border-2 border-gray-300 mx-auto"
        style={{
          width, height, borderRadius: shape === 'circle' ? '50%' : radius,
          transition: 'all 0.3s ease',
          boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <p className="text-gray-400 text-xs px-2">Upload image</p>
          </div>
        )}
        {/* NFC icon overlay */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
            <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
            <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
            <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8" />
            <path d="M16.37 2a20.16 20.16 0 0 1 0 20" />
          </svg>
          <span className="text-[9px] text-white font-bold">NFC</span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-5 font-medium">{size.label} NFC Badge</p>
      <p className="text-xs text-gray-400 mt-1">Tap with any phone to open your link</p>
    </div>
  );
}

/* ── Custom Quote Form (inline) ── */

function CustomQuoteForm() {
  const [form, setForm] = useState({ name: '', email: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('notes', form.description);
      fd.append('material', 'PLA');
      fd.append('color', 'Custom');
      fd.append('quantity', '1');
      if (file) fd.append('file', file);
      await fetch('/api/quote', { method: 'POST', body: fd });
      setSubmitted(true);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
        <p className="text-gray-500 text-sm">We&apos;ll review your request and get back to you within 24 hours with a quote.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-gray-500 text-sm mb-4">Describe what you want and we&apos;ll get back to you with a quote within 24 hours.</p>
      <input required type="text" placeholder="Your Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
      <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent" />
      <textarea required placeholder="Describe your custom swag — shape, size, material, quantity, design ideas..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent resize-none" />
      <div>
        <button type="button" onClick={() => fileRef.current?.click()} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1.5">
          <Upload className="w-4 h-4" /> {file ? file.name : 'Attach reference image (optional)'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
      </div>
      <button type="submit" disabled={submitting}
        className="w-full bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500 disabled:from-purple-300 disabled:to-purple-200 text-white py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Request</>}
      </button>
    </form>
  );
}

/* ── Main Page ── */

export default function CustomSwagPage() {
  const { addItem } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [swagType, setSwagType] = useState<SwagType | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [shape, setShape] = useState<Shape>('circle');
  const [size, setSize] = useState<Size>('medium');
  const [added, setAdded] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.match(/^image\/(png|jpe?g|svg\+xml)$/)) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const removeImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageFile(null);
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectedSize = SIZES.find(s => s.id === size)!;
  const selectedShape = SHAPES.find(s => s.id === shape)!;
  const selectedType = SWAG_TYPES.find(t => t.id === swagType);
  const isCustom = swagType === 'custom';
  const canAddToCart = swagType && swagType !== 'custom' && imageFile;

  const handleAddToCart = () => {
    if (!canAddToCart || !selectedType) return;
    const swagProduct: Product = {
      id: `swag-${swagType}-${Date.now()}`,
      name: `Custom ${selectedType.name} — ${selectedSize.name} ${selectedShape.name}`,
      category: 'swag',
      price: SWAG_PRICE,
      description: `Custom ${selectedType.name} with your uploaded design`,
      features: [],
      image: imageUrl || '/products/swag-box.jpg',
      inStock: true,
      leadTime: '3-5 days',
      materials: ['PLA'],
    };
    addItem(swagProduct);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const renderPreview = () => {
    if (!swagType || isCustom) return null;
    const props = { imageUrl, shape, size: selectedSize };
    switch (swagType) {
      case 'magnet': return <MagnetPreview {...props} />;
      case 'keychain': return <KeychainPreview {...props} />;
      case 'nfc-badge': return <NfcBadgePreview {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/#shop" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to shop
        </Link>

        <div className="text-center mb-12">
          <p className="text-purple-500 font-semibold text-sm uppercase tracking-wider mb-2">Design Your Own</p>
          <h1 className="text-4xl font-extrabold text-gray-900">Custom Swag</h1>
          <p className="text-gray-500 mt-2 max-w-lg mx-auto">Upload your image, pick a style, and preview your custom swag before ordering.</p>
        </div>

        {/* Step 1: Swag Type — always visible */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">1. Choose Type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SWAG_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => { setSwagType(type.id); setAdded(false); }}
                className={`p-4 rounded-2xl border-2 text-center transition-all ${
                  swagType === type.id
                    ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-500/10'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <type.icon className={`w-6 h-6 mx-auto mb-2 ${swagType === type.id ? 'text-purple-500' : 'text-gray-400'}`} />
                <p className={`text-sm font-bold ${swagType === type.id ? 'text-purple-700' : 'text-gray-700'}`}>{type.name}</p>
                <p className="text-[11px] text-gray-400 mt-1">{type.description}</p>
                {type.id !== 'custom' && <p className="text-xs font-bold text-purple-500 mt-1">${SWAG_PRICE.toFixed(2)}</p>}
              </button>
            ))}
          </div>
        </div>

        {/* Custom quote form */}
        {isCustom && (
          <div className="max-w-lg mx-auto bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Custom Swag Request</h2>
            <CustomQuoteForm />
          </div>
        )}

        {/* Builder flow for magnet/keychain/badge */}
        {swagType && !isCustom && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left: Configuration */}
            <div className="space-y-8">
              {/* Upload Image */}
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">2. Upload Image</h2>
                {imageUrl ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Uploaded" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{imageFile?.name}</p>
                      <p className="text-xs text-gray-400">{imageFile ? (imageFile.size / 1024).toFixed(1) + ' KB' : ''}</p>
                    </div>
                    <button onClick={removeImage} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      dragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white hover:border-purple-400 hover:bg-purple-50/50'
                    }`}
                  >
                    <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-purple-500' : 'text-gray-400'}`} />
                    <p className="text-sm font-semibold text-gray-700">Drag & drop or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, or SVG</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              </div>

              {/* Shape */}
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">3. Shape</h2>
                <div className="flex gap-3">
                  {SHAPES.map(s => (
                    <button key={s.id} onClick={() => setShape(s.id)}
                      className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                        shape === s.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <div className="mx-auto mb-2 w-8 h-8 bg-gray-300" style={{
                        borderRadius: s.id === 'circle' ? '50%' : s.id === 'rounded-rect' ? '6px' : '0',
                      }} />
                      <p className={`text-xs font-bold ${shape === s.id ? 'text-purple-700' : 'text-gray-600'}`}>{s.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">4. Size</h2>
                <div className="flex gap-3">
                  {SIZES.map(s => (
                    <button key={s.id} onClick={() => setSize(s.id)}
                      className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                        size === s.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <p className={`text-lg font-extrabold ${size === s.id ? 'text-purple-700' : 'text-gray-700'}`}>{s.label}</p>
                      <p className={`text-xs ${size === s.id ? 'text-purple-500' : 'text-gray-400'}`}>{s.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add to Cart */}
              <button onClick={handleAddToCart} disabled={!canAddToCart || added}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg ${
                  added ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                    : canAddToCart ? 'bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500 text-white shadow-purple-500/25'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}>
                {added ? <><Check className="w-5 h-5" /> Added to Cart!</> : <><ShoppingCart className="w-5 h-5" /> Add to Cart — ${SWAG_PRICE.toFixed(2)}</>}
              </button>
            </div>

            {/* Right: Live Preview */}
            <div className="lg:sticky lg:top-24 h-fit">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Preview</h2>
              <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center justify-center" style={{ minHeight: '300px' }}>
                  {renderPreview()}
                </div>

                {selectedType && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Type</span>
                      <span className="font-semibold text-gray-900">{selectedType.name}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-500">Size</span>
                      <span className="font-semibold text-gray-900">{selectedSize.label} ({selectedSize.name})</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-500">Shape</span>
                      <span className="font-semibold text-gray-900">{selectedShape.name}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Price</span>
                      <span className="font-extrabold text-lg text-gray-900">${SWAG_PRICE.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
