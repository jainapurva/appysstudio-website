import fs from 'fs';
import path from 'path';

const EVENTS_PATH = path.join(process.cwd(), 'data', 'events.json');

export type EventType =
  | 'page_view'
  | 'product_viewed'
  | 'add_to_cart'
  | 'checkout_started'
  | 'order_completed'
  | 'quote_submitted';

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  data: Record<string, string | number | undefined>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

function ensureEventsFile() {
  const dir = path.dirname(EVENTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(EVENTS_PATH)) fs.writeFileSync(EVENTS_PATH, JSON.stringify([]));
}

export function trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) {
  try {
    ensureEventsFile();
    const events: AnalyticsEvent[] = JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf-8'));
    events.push({ ...event, id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, timestamp: new Date().toISOString() });
    // Keep last 10,000 events to avoid unbounded growth
    if (events.length > 10000) events.splice(0, events.length - 10000);
    fs.writeFileSync(EVENTS_PATH, JSON.stringify(events));
  } catch (e) {
    console.error('Analytics tracking error:', e);
  }
}

export function getEvents(): AnalyticsEvent[] {
  try {
    ensureEventsFile();
    return JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

export function getAnalyticsSummary() {
  const events = getEvents();
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const inRange = (ts: string, from: Date) => new Date(ts) >= from;

  const byType = (type: EventType, from?: Date) =>
    events.filter(e => e.type === type && (!from || inRange(e.timestamp, from)));

  // Product popularity
  const productViews: Record<string, number> = {};
  const cartAdds: Record<string, number> = {};
  events.filter(e => e.type === 'product_viewed').forEach(e => {
    const name = String(e.data.productName || e.data.productId || 'Unknown');
    productViews[name] = (productViews[name] || 0) + 1;
  });
  events.filter(e => e.type === 'add_to_cart').forEach(e => {
    const name = String(e.data.productName || e.data.productId || 'Unknown');
    cartAdds[name] = (cartAdds[name] || 0) + 1;
  });

  const topProducts = Object.entries(productViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, views]) => ({ name, views, cartAdds: cartAdds[name] || 0 }));

  // Daily page views (last 14 days)
  const dailyViews: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    dailyViews[d.toISOString().slice(0, 10)] = 0;
  }
  events.filter(e => e.type === 'page_view' && inRange(e.timestamp, new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000))).forEach(e => {
    const day = e.timestamp.slice(0, 10);
    if (day in dailyViews) dailyViews[day]++;
  });

  return {
    totals: {
      pageViews: byType('page_view').length,
      productViews: byType('product_viewed').length,
      cartAdds: byType('add_to_cart').length,
      checkoutsStarted: byType('checkout_started').length,
      ordersCompleted: byType('order_completed').length,
      quotesSubmitted: byType('quote_submitted').length,
    },
    last7Days: {
      pageViews: byType('page_view', last7Days).length,
      cartAdds: byType('add_to_cart', last7Days).length,
      orders: byType('order_completed', last7Days).length,
      quotes: byType('quote_submitted', last7Days).length,
    },
    last30Days: {
      pageViews: byType('page_view', last30Days).length,
      cartAdds: byType('add_to_cart', last30Days).length,
      orders: byType('order_completed', last30Days).length,
      quotes: byType('quote_submitted', last30Days).length,
    },
    topProducts,
    dailyViews: Object.entries(dailyViews).map(([date, count]) => ({ date, count })),
    recentEvents: events.slice(-50).reverse(),
  };
}
