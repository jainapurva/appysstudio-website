import type { Metadata } from 'next';
import Image from 'next/image';
import { products } from '@/lib/products';
import ShopSection from '@/components/ShopSection';
import QuoteForm from '@/components/QuoteForm';

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

const FILAMENT_DOTS = [
  { name: 'White', bg: '#F4F4EF' },
  { name: 'Black', bg: '#252525' },
  { name: 'Red', bg: '#CC2222' },
  { name: 'Blue', bg: '#2255BB' },
  { name: 'Yellow', bg: '#FFD700' },
  { name: 'Green', bg: '#33AA55' },
  { name: 'Orange', bg: '#FF6633' },
  { name: 'Gray', bg: '#888888' },
  { name: 'Pink', bg: '#FF88AA' },
  { name: 'Purple', bg: '#7744BB' },
  { name: 'Red · Sunlu', bg: '#DD1111' },
  { name: 'Blue · Sunlu', bg: '#1E4DB7' },
  { name: 'Yellow · Sunlu', bg: '#FFCC00' },
  { name: 'Green · Sunlu', bg: '#22AA44' },
  { name: 'Orange · Sunlu', bg: '#FF5500' },
  { name: 'Silk Gold', bg: 'linear-gradient(135deg,#e8c55a,#D4AF37)' },
  { name: 'Silk Silver', bg: 'linear-gradient(135deg,#dddddd,#aaaaaa)' },
  { name: 'Transparent', bg: '#C8E8F0' },
];

const MARQUEE_ITEMS = ['desk organizers', 'named bag charms', 'catan trays', 'book trackers', 'robot watch stands', 'controller stands', 'your idea, printed'];

const FAQS = [
  { q: 'What materials do you print with?', a: 'Mostly PLA, PETG, TPU, and ASA. PLA is lovely for most indoor pieces, PETG shrugs off moisture, TPU bends and bounces, and ASA lives happily outdoors.' },
  { q: 'How long does printing take?', a: "Most shelf items ship in 1–5 business days. Custom prints depend on how ambitious you're feeling — your quote will have the exact lead time." },
  { q: 'What file formats can I send?', a: "STL, OBJ, 3MF, STEP, IGES, FBX, PLY, AMF, and GCODE. If it's a common 3D format, we can almost certainly print it." },
  { q: 'Do you do bulk orders?', a: 'Happily! Orders of 10+ pieces get volume pricing. Write to us for a custom quote.' },
  { q: 'What colors are available?', a: 'Every piece comes in your choice of 20+ filament colors — always free. Specialty silks may add a tiny upcharge.' },
];

export default function Home() {
  return (
    <div className="bg-paper overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <header className="pt-[72px] pb-24 px-4 sm:px-8">
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-12 items-center">
          <div>
            <div className="kicker mb-5">Handmade in the USA · 4,000+ pieces shipped</div>
            <h1 className="text-[clamp(44px,5.6vw,72px)] leading-[1.05] mb-6 text-ink">
              Little joys,<br />
              printed{' '}
              <span className="squig">
                layer by layer
                <svg viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 10 Q 25 2, 50 9 T 100 9 T 150 9 T 200 9 T 250 9 T 298 8" />
                </svg>
              </span>
            </h1>
            <p className="text-[19px] leading-[1.65] text-ink2 max-w-[460px] mb-9">
              We&apos;re a tiny studio making cheerful, useful things — organizers, game-night trays, little robots that hold your watch. Every piece is printed fresh when you order it, in a color you pick.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a href="#shop" className="btn-clay">Browse the shelf →</a>
              <a href="#custom" className="btn-line">Print my idea</a>
            </div>
          </div>
          <div className="relative h-[480px] hidden sm:block">
            <svg className="absolute -top-3.5 right-[16%] w-[110px] h-[110px] z-5 craft-spin !animate-[craft-spin_16s_linear_infinite]" viewBox="0 0 110 110" aria-hidden="true">
              <defs>
                <path id="circ" d="M55,55 m-42,0 a42,42 0 1,1 84,0 a42,42 0 1,1 -84,0" />
              </defs>
              <text className="fill-sage-dark font-bold uppercase" style={{ fontSize: '10px', letterSpacing: '.14em' }}>
                <textPath href="#circ">made with love · made to order ·&#160;</textPath>
              </text>
              <text x="55" y="66" textAnchor="middle" className="fill-sage-dark" style={{ fontSize: '30px' }}>✳︎</text>
            </svg>
            <figure className="pol w-[250px] top-[26px] left-[6%] -rotate-6 z-2">
              <Image src="/products/book-tracker-lifestyle.jpg" alt="Book tracker on a shelf" width={226} height={210} className="object-cover rounded-[2px] w-[226px] h-[210px]" priority />
              <figcaption>your reading year</figcaption>
            </figure>
            <figure className="pol w-[230px] top-[130px] right-[4%] rotate-[4deg] z-3 [animation-delay:1.2s]">
              <Image src="/products/love-lamp-lifestyle.jpg" alt="Love lamp glowing warmly" width={206} height={190} className="object-cover rounded-[2px] w-[206px] h-[190px]" priority />
              <figcaption>a warm glow</figcaption>
            </figure>
            <figure className="pol w-[210px] bottom-0 left-[24%] -rotate-2 z-4 [animation-delay:2.4s]">
              <Image src="/products/catan-tray-1.jpg" alt="Catan player trays" width={186} height={170} className="object-cover rounded-[2px] w-[186px] h-[170px]" priority />
              <figcaption>game night, sorted</figcaption>
            </figure>
          </div>
        </div>
      </header>

      {/* Marquee */}
      <div className="marq" aria-hidden="true">
        <div className="marq-in">
          {[0, 1].map(dup => (
            <span key={dup} className="contents">
              {MARQUEE_ITEMS.map(item => (
                <span key={`${dup}-${item}`}>{item}<b>✳︎</b></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Shop — The shelf */}
      <section id="shop" className="max-w-[1140px] mx-auto px-4 sm:px-8 pt-[104px] pb-10 scroll-mt-20">
        <div className="text-center mb-5">
          <h2 className="text-[clamp(34px,4vw,50px)] mb-3 text-ink">The shelf</h2>
          <p className="text-ink2 text-[17px]">Little things we love making. Each one printed to order, just for you.</p>
        </div>
        <p className="hand-note text-center text-[19px] mb-11">~ go on, pick one up ~</p>
        <ShopSection products={products} />
      </section>

      {/* Colors */}
      <section id="colors" className="py-24 px-4 text-center">
        <div className="max-w-[1140px] mx-auto">
          <h2 className="text-[clamp(34px,4vw,50px)] mb-3 text-ink">Pick a color, any color</h2>
          <p className="text-ink2 text-[17px]">Every piece comes in your choice of 20+ filament colors — always free.</p>
          <div className="flex flex-wrap gap-3.5 justify-center max-w-[640px] mx-auto mt-10 mb-5">
            {FILAMENT_DOTS.map(dot => (
              <div key={dot.name} className="group relative w-11 h-11 rounded-full border-[3px] border-white shadow-[0_3px_8px_rgba(61,47,36,.2)] transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] hover:scale-[1.35] hover:rotate-[10deg] hover:z-2 cursor-pointer" style={{ background: dot.bg }}>
                <span className="absolute -bottom-[30px] left-1/2 -translate-x-1/2 scale-75 bg-ink text-paper text-[11px] font-bold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all whitespace-nowrap pointer-events-none">{dot.name}</span>
              </div>
            ))}
          </div>
          <p className="hand-note text-[19px] !text-ink2">~ specialty silks may add a tiny upcharge ~</p>
        </div>
      </section>

      {/* How we make */}
      <section id="how" className="bg-paper2 border-y border-dashed border-ink/25 py-24 px-4 scroll-mt-20">
        <div className="max-w-[1140px] mx-auto">
          <div className="text-center">
            <h2 className="text-[clamp(34px,4vw,50px)] mb-3 text-ink">How we make your thing</h2>
            <p className="text-ink2 text-[17px]">No warehouses, no dusty stock. Just a printer warming up with your name on the queue.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-9 mt-14">
            {[
              { n: '1', title: 'You pick', text: 'Choose from the shelf — or upload your own 3D file for something one-of-a-kind. Tell us your color.' },
              { n: '2', title: 'We print', text: 'Your piece is printed fresh, checked over, and finished by hand. Custom quotes come back within 24 hours.' },
              { n: '3', title: 'It arrives', text: 'Packed up snug and shipped in 1–5 days across the USA and Canada. Ta-da — a little joy in the mail.' },
            ].map(step => (
              <div key={step.n} className="step text-center px-3">
                <div className="stepnum">{step.n}</div>
                <h3 className="text-[22px] mb-2.5 text-ink">{step.title}</h3>
                <p className="text-ink2 text-[15px] leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom quote */}
      <section id="custom" className="bg-clay py-[104px] px-4 scroll-mt-20 relative overflow-hidden">
        <span className="absolute -top-[60px] -left-10 text-[200px] text-paper/8 craft-spin !animate-[craft-spin_30s_linear_infinite]" aria-hidden="true">✳︎</span>
        <span className="absolute -bottom-[70px] -right-8 text-[200px] text-paper/8 craft-spin !animate-[craft-spin_30s_linear_infinite_reverse]" aria-hidden="true">✳︎</span>
        <div className="max-w-3xl mx-auto relative">
          <div className="text-center mb-10">
            <h2 className="text-[clamp(34px,4vw,50px)] text-white mb-4">Got an idea in your head?</h2>
            <p className="text-paper/85 text-[17px] leading-[1.65] max-w-[520px] mx-auto">
              Upload your 3D file and a note about what you&apos;re dreaming up. We&apos;ll write back within 24 hours with a price, a lead time, and probably some excitement.
            </p>
          </div>
          <QuoteForm />
          <div className="flex flex-wrap gap-2.5 justify-center mt-8">
            {['STL', 'OBJ', '3MF', 'STEP', 'FBX', 'PLY', '+ more'].map(f => (
              <span key={f} className="border-[1.5px] border-dashed border-paper/50 text-paper px-4 py-2 rounded-full font-bold text-[13px] tracking-wide">{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-[104px] px-4 scroll-mt-20">
        <div className="max-w-[760px] mx-auto">
          <h2 className="text-center text-[clamp(32px,4vw,46px)] mb-12 text-ink">Wondering something?</h2>
          {FAQS.map(faq => (
            <details key={faq.q} className="group bg-white rounded-2xl mb-3.5 shadow-[0_2px_0_rgba(61,47,36,.1)] overflow-hidden">
              <summary className="px-6.5 py-5 font-bold text-[16.5px] cursor-pointer list-none flex justify-between items-center text-ink [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span className="font-display text-2xl text-clay transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-6.5 pb-5.5 text-ink2 text-[15px] leading-[1.65]">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
