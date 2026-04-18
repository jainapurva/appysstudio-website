'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Product, FilamentColor } from '@/lib/products';

export interface CartItemCustomization {
  color?: FilamentColor;
  variant?: 'with-divider' | 'without-divider';
  customDimensions?: { length: number; width: number; height: number };
}

export interface CartItem {
  product: Product;
  quantity: number;
  customizations?: CartItemCustomization;
  cartKey: string;
}

function makeCartKey(productId: string, customizations?: CartItemCustomization): string {
  if (!customizations) return productId;
  const parts = [productId];
  if (customizations.color) parts.push(`${customizations.color.name}-${customizations.color.brand}`);
  if (customizations.variant) parts.push(customizations.variant);
  if (customizations.customDimensions) {
    const d = customizations.customDimensions;
    parts.push(`${d.length}x${d.width}x${d.height}`);
  }
  return parts.join('|');
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, customizations?: CartItemCustomization) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, customizations?: CartItemCustomization) => {
    setItems(prev => {
      const cartKey = makeCartKey(product.id, customizations);
      const existing = prev.find(i => i.cartKey === cartKey);
      if (existing) return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, customizations, cartKey }];
    });
  }, []);

  const removeItem = useCallback((cartKey: string) => {
    setItems(prev => prev.filter(i => i.cartKey !== cartKey));
  }, []);

  const updateQuantity = useCallback((cartKey: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.cartKey !== cartKey));
    } else {
      setItems(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
