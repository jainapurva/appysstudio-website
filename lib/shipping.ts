// Zone-based US shipping rates (shipping from Ontario, Canada to US)
// Zones determined by first digit of zip code

export interface ShippingRate {
  cost: number;
  label: string;
  estimatedDays: string;
}

// Fixed weights per product (lbs)
const PRODUCT_WEIGHTS: Record<string, number> = {
  'books-read-tracker': 0.4,
  'robot-watch-stand': 0.3,
  'ps5-controller-stand': 0.6,
  'desk-organizer': 0.5,
};
const DEFAULT_WEIGHT = 0.4;

// Shipping zones by first digit of zip code
// Base rate for up to 1 lb, +$1.50 per additional lb
const ZONES: Array<{ prefixes: string[]; base: number; label: string; days: string }> = [
  { prefixes: ['0', '1'], base: 7.99,  label: 'USPS First Class',    days: '5-7 business days' },
  { prefixes: ['2', '3'], base: 8.99,  label: 'USPS First Class',    days: '6-8 business days' },
  { prefixes: ['4', '5'], base: 9.99,  label: 'USPS Priority',       days: '7-9 business days' },
  { prefixes: ['6', '7'], base: 10.99, label: 'USPS Priority',       days: '7-10 business days' },
  { prefixes: ['8', '9'], base: 12.99, label: 'USPS Priority Mail',  days: '9-12 business days' },
];

export function getProductWeight(productId: string): number {
  return PRODUCT_WEIGHTS[productId] ?? DEFAULT_WEIGHT;
}

export function calculateShipping(
  zipCode: string,
  items: Array<{ productId: string; quantity: number }>
): ShippingRate | null {
  const zip = zipCode.replace(/\D/g, '');
  if (zip.length < 5) return null;

  const firstDigit = zip[0];
  const zone = ZONES.find(z => z.prefixes.includes(firstDigit));
  if (!zone) return null;

  const totalWeight = items.reduce((sum, item) => {
    return sum + getProductWeight(item.productId) * item.quantity;
  }, 0);

  // Base rate covers up to 1 lb; +$1.50 per additional lb
  const extraLbs = Math.max(0, totalWeight - 1);
  const cost = zone.base + extraLbs * 1.5;

  return {
    cost: Math.round(cost * 100) / 100,
    label: zone.label,
    estimatedDays: zone.days,
  };
}

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];
