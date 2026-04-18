export interface FilamentColor {
  name: string;
  hex: string;
  brand: 'Elegoo' | 'Sunlu';
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  features: string[];
  image: string;
  images?: string[];
  inStock: boolean;
  leadTime: string;
  materials: string[];
  colors?: FilamentColor[];
  hasDividerOption?: boolean;
  hasCustomSize?: boolean;
}

export const ORGANIZER_COLORS: FilamentColor[] = [
  // Elegoo PLA
  { name: 'White', hex: '#F4F4EF', brand: 'Elegoo' },
  { name: 'Black', hex: '#252525', brand: 'Elegoo' },
  { name: 'Red', hex: '#CC2222', brand: 'Elegoo' },
  { name: 'Blue', hex: '#2255BB', brand: 'Elegoo' },
  { name: 'Yellow', hex: '#FFD700', brand: 'Elegoo' },
  { name: 'Green', hex: '#33AA55', brand: 'Elegoo' },
  { name: 'Orange', hex: '#FF6633', brand: 'Elegoo' },
  { name: 'Gray', hex: '#888888', brand: 'Elegoo' },
  { name: 'Pink', hex: '#FF88AA', brand: 'Elegoo' },
  { name: 'Purple', hex: '#7744BB', brand: 'Elegoo' },
  // Sunlu PLA
  { name: 'White', hex: '#F0F0EB', brand: 'Sunlu' },
  { name: 'Black', hex: '#1A1A1A', brand: 'Sunlu' },
  { name: 'Red', hex: '#DD1111', brand: 'Sunlu' },
  { name: 'Blue', hex: '#1E4DB7', brand: 'Sunlu' },
  { name: 'Yellow', hex: '#FFCC00', brand: 'Sunlu' },
  { name: 'Green', hex: '#22AA44', brand: 'Sunlu' },
  { name: 'Orange', hex: '#FF5500', brand: 'Sunlu' },
  { name: 'Gray', hex: '#777777', brand: 'Sunlu' },
  { name: 'Pink', hex: '#FF77AA', brand: 'Sunlu' },
  { name: 'Silk Gold', hex: '#D4AF37', brand: 'Sunlu' },
  { name: 'Silk Silver', hex: '#C0C0C0', brand: 'Sunlu' },
  { name: 'Transparent', hex: '#C8E8F0', brand: 'Sunlu' },
];

export const products: Product[] = [
  {
    id: 'stackable-organizer-box',
    name: 'Stackable Organizer Box',
    category: 'functional',
    price: 12.99,
    description: 'Modular stackable boxes to keep your desk, drawers, or shelves tidy. Boxes snap together and stack cleanly. Choose your filament brand, color, and whether you want an internal divider. Need a specific size? Enter custom dimensions.',
    features: [
      'Stackable & modular design',
      'Optional internal divider',
      'Custom sizes available',
      'Choice of Elegoo or Sunlu PLA colors',
      'Strong interlocking rim for stable stacking',
    ],
    image: '/products/organizer-box-top.jpg',
    images: [
      '/products/organizer-box-top.jpg',
      '/products/organizer-box-open.jpg',
      '/products/organizer-box-stacked.jpg',
      '/products/organizer-box-colors.jpg',
    ],
    inStock: true,
    leadTime: '3-5 days',
    materials: ['PLA'],
    colors: ORGANIZER_COLORS,
    hasDividerOption: true,
    hasCustomSize: true,
  },
  {
    id: 'books-read-tracker',
    name: 'Books Read This Year Tracker',
    category: 'decorative',
    price: 9.99,
    description: 'Track your reading goals with this charming desk counter. Rotatable number dials let you update your count as you finish each book. Features miniature 3D book decorations.',
    features: ['Rotatable number dials', 'Miniature book details', 'Two-tone design', 'Desk or shelf display'],
    image: '/products/book-tracker-product.jpg',
    images: ['/products/book-tracker-product.jpg', '/products/book-tracker-lifestyle.jpg'],
    inStock: true,
    leadTime: '3-4 days',
    materials: ['PLA'],
  },
  {
    id: 'robot-watch-stand',
    name: 'Robot Apple Watch Charging Stand',
    category: 'functional',
    price: 9.99,
    description: 'Adorable robot character that holds your Apple Watch charger as its face. Your watch charges while sitting on this cute little buddy. A fun conversation starter for any desk.',
    features: ['Fits Apple Watch charger', 'Cute robot design', 'Cable management', 'Stable base'],
    image: '/products/robot-watch-stand-product.jpg',
    inStock: true,
    leadTime: '2-3 days',
    materials: ['PLA'],
  },
  {
    id: 'ps5-controller-stand',
    name: 'PS5 DualSense Controller Stand',
    category: 'gaming',
    price: 9.99,
    description: 'Sleek stand for two PS5 DualSense controllers with PS5 branding and PlayStation logo. Black and white two-tone design perfectly matches your PS5 console. Keeps your controllers organized and your gaming setup clean.',
    features: ['Holds 2 controllers', 'PS5-inspired design', 'Two-tone black/white', 'Matches PS5 aesthetic'],
    image: '/products/ps5-tower-gaming.jpg',
    images: ['/products/ps5-tower-gaming.jpg', '/products/ps5-tower-with-console.jpg', '/products/ps5-tower-closeup.jpg'],
    inStock: true,
    leadTime: '3-4 days',
    materials: ['PLA', 'PETG'],
  },
  {
    id: 'catan-player-trays',
    name: 'Catan Player Piece Trays (Set of 4)',
    category: 'gaming',
    price: 9.99,
    description: 'Upgrade your Catan game nights with these custom 3D printed player piece trays. Each set includes 4 hexagonal trays with colored lids engraved with the CATAN logo. Keeps settlements, cities, and roads neatly organized for each player — no more digging through the box.',
    features: ['Set of 4 trays (blue, orange, red, white)', 'CATAN logo engraved on each lid', 'Holds all settlements, cities & roads', 'Hexagonal design matches the game aesthetic', 'Two-piece lid + base design'],
    image: '/products/catan-tray-5.jpg',
    images: ['/products/catan-tray-5.jpg', '/products/catan-tray-1.jpg', '/products/catan-tray-3.jpg'],
    inStock: true,
    leadTime: '4-5 days',
    materials: ['PLA'],
  },
  {
    id: 'desk-organizer',
    name: 'Multi-Compartment Desk Organizer',
    category: 'functional',
    price: 9.99,
    description: 'Keep your desk tidy with this multi-compartment organizer. Holds remotes, glasses, coasters, phones, and everyday essentials in one clean spot. Perfect for living room coffee tables or home office desks.',
    features: ['Multiple compartments', 'Holds remotes, glasses & more', 'Stable flat base', 'Clean modern design'],
    image: '/products/desk-organizer-product.jpg',
    images: ['/products/desk-organizer-product.jpg', '/products/desk-organizer-2.jpg', '/products/desk-organizer-3.jpg'],
    inStock: true,
    leadTime: '3-4 days',
    materials: ['PLA'],
  },
];
