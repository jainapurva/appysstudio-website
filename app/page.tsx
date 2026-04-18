import type { Metadata } from 'next';
import Image from 'next/image';
import { products } from '@/lib/products';
import ShopSection from '@/components/ShopSection';
import QuoteForm from '@/components/QuoteForm';
import { ArrowRight, Star, Upload, CheckCircle, Package, Zap, Shield, Truck } from 'lucide-react';

export const metadata: Metadata = {
  title: "Appy's Studio — Custom 3D Printed Products",
  description: 'Shop handmade custom 3D printed products: desk organizers, Catan trays, Apple Watch stands, PS5 controller stands & more. Free color selection, fast shipping to USA from Canada.',
  alternates: { canonical: 'https://appysstudio.com' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://appysstudio.com/#organization',
      name: "Appy's Studio",
      url: 'https://appysstudio.com',
      logo: 'https://appysstudio.com/icon-512.png',
      description: 'Custom 3D printed products handmade in Canada.',
      email: 'appysstudioca@gmail.com',
    },
    {
      '@type': 'WebSite',
      '@id': 'https://appysstudio.com/#website',
      url: 'https://appysstudio.com',
      name: "Appy's Studio",
      publisher: { '@id': 'https://appysstudio.com/#organization' },
    },
    ...products.map(p => ({
      '@type': 'Product',
      name: p.name,
      description: p.description,
      image: `https://appysstudio.com${p.image}`,
      brand: { '@type': 'Brand', name: "Appy's Studio" },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        reviewCount: '12',
        bestRating: '5',
        worstRating: '1',
      },
      review: {
        '@type': 'Review',
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        author: { '@type': 'Person', name: 'Sarah M.' },
        reviewBody: 'Amazing quality! The organizer box fits perfectly on my desk and the color is exactly as shown.',
      },
      offers: {
        '@type': 'Offer',
        price: p.price.toFixed(2),
        priceCurrency: 'USD',
        availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: 'https://appysstudio.com/#shop',
        priceValidUntil: '2027-12-31',
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'MonetaryAmount',
            value: '4.99',
            currency: 'USD',
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: ['US', 'CA'],
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 1,
              maxValue: 3,
              unitCode: 'DAY',
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 3,
              maxValue: 7,
              unitCode: 'DAY',
            },
          },
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: ['US', 'CA'],
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 30,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/FreeReturn',
        },
      },
    })),
  ],
};

export default function Home() {
  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-950 pt-20 pb-28 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-600/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-300 text-sm font-semibold px-4 py-2 rounded-full mb-8 ring-1 ring-purple-500/20">
                <Star className="w-4 h-4 fill-purple-300" />
                4,000+ pieces shipped and counting
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight">
                Precision 3D Prints,{' '}
                <span className="bg-gradient-to-r from-purple-400 to-purple-300 bg-clip-text text-transparent">Built to Order</span>
              </h1>
              <p className="text-lg text-gray-400 max-w-lg mb-10 leading-relaxed">
                From desk organizers to custom 3D printed objects — we make functional, beautiful 3D printed products with fast turnaround and real craftsmanship. Send us your design to get a quote.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#shop" className="bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40">
                  Shop Products <ArrowRight className="w-5 h-5" />
                </a>
                <a href="#custom" className="bg-white/5 ring-1 ring-white/10 hover:bg-white/10 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5" /> Upload Your Design
                </a>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative w-full aspect-square max-w-lg ml-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-purple-400/20 rounded-3xl rotate-3" />
                <div className="relative w-full h-full rounded-3xl overflow-hidden ring-1 ring-white/10">
                  <Image
                    src="https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=800&fit=crop"
                    alt="3D Printing"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white py-16 px-4 border-b border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '4,000+', label: 'Pieces Shipped', icon: Truck },
            { value: '3+', label: 'Products', icon: Package },
            { value: '1-5', label: 'Day Lead Time', icon: Zap },
            { value: '5+', label: 'Materials Available', icon: Shield },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <s.icon className="w-6 h-6 text-purple-500" />
              </div>
              <div className="text-3xl font-extrabold text-gray-900 mb-1">{s.value}</div>
              <div className="text-gray-500 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Shop — Products with category tabs */}
      <section id="shop" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 scroll-mt-20">
        <div className="text-center mb-12">
          <p className="text-purple-500 font-semibold text-sm uppercase tracking-wider mb-2">Our Collection</p>
          <h2 className="text-4xl font-extrabold text-gray-900">Shop Products</h2>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">Browse our catalog of ready-to-print items — made fresh to order.</p>
        </div>
        <ShopSection products={products} />
      </section>

      {/* How it works */}
      <section id="how" className="bg-gray-50 py-24 px-4 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-purple-500 font-semibold text-sm uppercase tracking-wider mb-2">Simple Process</p>
            <h2 className="text-4xl font-extrabold text-gray-900">How It Works</h2>
            <p className="text-gray-500 mt-2 max-w-2xl mx-auto">Ordering is simple — whether you pick from our catalog or bring your own design.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-400 rounded-2xl flex items-center justify-center mb-6">
                <Package className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">Order from Catalog</h3>
              <ol className="space-y-3 text-gray-600 text-sm">
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span>Browse our product catalog above</span></li>
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span>Add items to cart, choose material &amp; color</span></li>
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span>Place your order — we start printing</span></li>
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span>Delivered in 1-5 days</span></li>
              </ol>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-400 rounded-2xl flex items-center justify-center mb-6">
                <Upload className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">Custom 3D Print</h3>
              <ol className="space-y-3 text-gray-600 text-sm">
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span>Upload your 3D file below</span></li>
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span>Tell us material, color &amp; quantity</span></li>
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span>We review and send you a quote + lead time</span></li>
                <li className="flex gap-3"><CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" /><span>Approve and we start printing</span></li>
              </ol>
              <a href="#custom" className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-600 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-500/25">
                Get a Quote <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Print Quote */}
      <section id="custom" className="bg-gray-950 py-24 px-4 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-purple-400 font-semibold text-sm uppercase tracking-wider mb-2">Custom</p>
            <h2 className="text-4xl font-extrabold text-white">Custom Print Quote</h2>
            <p className="text-gray-400 mt-3 max-w-xl mx-auto">Upload your 3D file and tell us what you need. We&apos;ll send you a price and lead time within 24 hours.</p>
          </div>
          <QuoteForm />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-gray-50 py-24 px-4 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-purple-500 font-semibold text-sm uppercase tracking-wider mb-2">Support</p>
            <h2 className="text-4xl font-extrabold text-gray-900">Frequently Asked Questions</h2>
          </div>
          {[
            { q: 'What materials do you print with?', a: 'We primarily use PLA, PETG, TPU, and ASA. PLA is great for most indoor products, PETG for moisture resistance, TPU for flexible parts, and ASA for outdoor use.' },
            { q: 'How long does printing take?', a: "Most catalog items ship in 1-5 business days. Custom prints depend on complexity — we'll tell you the exact lead time in your quote." },
            { q: 'What file formats do you accept for custom prints?', a: 'We accept STL, OBJ, 3MF, STEP, IGES, FBX, PLY, AMF, and GCODE files. Most common 3D file formats are supported.' },
            { q: 'Do you offer bulk/wholesale pricing?', a: 'Yes! For orders of 10+ pieces we offer volume discounts. Contact us for a custom quote.' },
            { q: 'What colors are available?', a: 'We stock 20+ colors for most materials including black, white, grey, red, blue, green, orange, and more. Some specialty colors may require a small upcharge.' },
          ].map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 mb-4 border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-900 mb-2">{faq.q}</h4>
              <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-400" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent" />
        <div className="relative text-center max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold text-white mb-4">Ready to print something amazing?</h2>
          <p className="text-purple-100 mb-10 text-lg">Browse our catalog or upload your own design. Fast turnaround, great quality.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#shop" className="bg-white text-purple-600 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-purple-50 transition-colors shadow-lg">Shop Now</a>
            <a href="#custom" className="ring-2 ring-white text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/10 transition-colors">Custom Quote</a>
          </div>
        </div>
      </section>
    </div>
  );
}
