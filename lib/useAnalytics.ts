'use client';

type EventType = 'page_view' | 'product_viewed' | 'add_to_cart' | 'checkout_started' | 'order_completed' | 'quote_submitted';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// Map internal event names to GA4 recommended event names
const GA4_EVENT_MAP: Record<EventType, string> = {
  page_view: 'page_view',
  product_viewed: 'view_item',
  add_to_cart: 'add_to_cart',
  checkout_started: 'begin_checkout',
  order_completed: 'purchase',
  quote_submitted: 'generate_lead',
};

export function trackEvent(type: EventType, data: Record<string, string | number | undefined> = {}) {
  // Send to internal analytics
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch(() => {});

  // Send to Google Analytics 4
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', GA4_EVENT_MAP[type] ?? type, data);
  }
}
