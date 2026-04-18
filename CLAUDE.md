# Appy's Studio - 3D Printing & Robotics

## Project Overview
E-commerce website for Appy's Studio — 3D printing & robotics. Built with Next.js 16 + TypeScript, deployed on AWS EC2 at https://appysstudio.com.

> **Canonical repo:** `jainapurva/appysstudio-website` (this repo).
> The older `jainapurva/printcraft-shop` repo is archived — do not push there.
> The static HTML site that used to live in this repo is preserved on the
> `archive/static-site` branch for reference only.

## Architecture
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Auth:** NextAuth with optional Google/Facebook/Apple OAuth
- **Payments:** Square Checkout API via Payment Links (`square` v44 SDK)
  - Creates hosted checkout links, customer pays on Square's page
  - Order verification on redirect back (not webhooks — Square Payment Links don't reliably fire webhook events)
  - Gracefully falls back to manual orders if Square env vars not set
- **Email:** Nodemailer + Gmail (`appysstudioca@gmail.com`), gracefully skips if GMAIL creds missing
- **Data:** JSON file-based storage (`data/orders.json`) via `lib/orders.ts`
- **Styling:** Tailwind CSS, purple theme matching Appy's Studio logo

## Key Files
- `lib/products.ts` - Product catalog (3 products), Product interface
- `lib/orders.ts` - Order interface + JSON file read/write (`squarePaymentId` field for idempotency)
- `lib/email.ts` - Email with graceful no-op when creds missing
- `lib/auth.ts` - NextAuth config, providers are conditional
- `app/api/checkout/route.ts` - Square checkout via `client.checkout.paymentLinks.create()`, coupon support
- `app/api/verify-order/route.ts` - Primary order save: fetches order from Square API on redirect, saves to DB, sends emails
- `app/api/webhook/route.ts` - Square webhook handler (backup, rarely fires for Payment Links)
- `app/api/quote/route.ts` - Custom print & custom swag quote submissions
- `app/custom-swag/page.tsx` - Custom swag builder (magnet/keychain/NFC badge/custom)
- `components/ShopSection.tsx` - Product grid + Custom Swag CTA card
- `components/ProductCard.tsx` - Individual product card
- `components/ProductDetailModal.tsx` - Full modal with image carousel (Framer Motion)
- `components/Navbar.tsx` - Sticky nav bar
- `components/QuoteForm.tsx` - Custom 3D print quote form
- `app/cart/page.tsx` - Cart page with coupon code input, saves `squareOrderId` to sessionStorage
- `app/order-success/page.tsx` - Calls `/api/verify-order` on mount to confirm & save order

## Payment Flow
1. User adds items to cart, optionally enters coupon code
2. `POST /api/checkout` creates Square Payment Link with line items + discounts
3. Response includes `squareOrderId` — saved to sessionStorage before redirect
4. User pays on Square's hosted checkout page
5. Square redirects to `/order-success`
6. Success page reads `squareOrderId` from sessionStorage, calls `POST /api/verify-order`
7. Verify endpoint fetches order from Square API, confirms payment (tenders exist), saves to `data/orders.json`, sends confirmation emails
8. Webhook at `/api/webhook` exists as backup but Square Payment Links don't reliably trigger it

## Coupon Codes
Defined in `app/api/checkout/route.ts`:
- `TESTFREE` — 100% off (for testing), expires 2026-03-01
- `FRIENDS50` — 50% off, expires 2026-03-01

## Deployment
- **Production:** AWS EC2 (`3.238.88.157`) — https://appysstudio.com (SSL via certbot)
- **GitHub:** `git@github-jainapurva:jainapurva/appysstudio-website.git`
- **Server:** nginx reverse proxy → Node.js on port 3001
- **Service:** `systemctl restart appysstudio-website` (renamed from `3dprints-shop` on 2026-04-18)
- **Logs:** `sudo journalctl -u appysstudio-website -f`
- **Server app dir:** `/opt/3dprints-shop/` (path retained from pre-rename)
- **Server env file:** `/opt/3dprints-shop/.env`

### CI deploy (preferred)
Push any tag starting with `deploy-` to trigger GitHub Actions deploy:
```
git tag deploy-2026-04-18-1
git push origin deploy-2026-04-18-1
```
Workflow: `.github/workflows/deploy.yml`. SSHes into EC2 using `EC2_DEPLOY_KEY`
secret (deploy-only Ed25519 key), pulls main, builds, restarts the service.

### Manual deploy (fallback)
`bash deploy_to_aws.sh` — builds locally and rsyncs standalone build to EC2.

### SSH access
- **Deploy-only key** (used by CI): `/media/ddarji/storage/.ssh/appysstudio_deploy`
  - `ssh -i /media/ddarji/storage/.ssh/appysstudio_deploy ubuntu@3.238.88.157`
- Shared key (`socialAI.pem`) still works but prefer the deploy-only key for CI

## Environment Variables
All optional for local dev (features gracefully degrade):
- `SQUARE_ACCESS_TOKEN` - Square API access token
- `SQUARE_LOCATION_ID` - Square location ID
- `SQUARE_ENVIRONMENT` - `sandbox` or `production`
- `SQUARE_WEBHOOK_SIGNATURE_KEY` - Webhook signature verification
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` - Email sending
- `OWNER_EMAIL` - Owner notification email (defaults to GMAIL_USER)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` - Facebook OAuth
- `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` - Apple OAuth
- `ADMIN_PASSWORD` - Analytics page (defaults to `printcraft2025`)
- `NEXTAUTH_SECRET` - JWT signing (auto-generated in dev)

## Site Structure & Navigation
- **Homepage** (`/`) — Hero, Stats, Shop (3 products + Custom Swag card), How It Works, Custom Print Quote Form, FAQ, CTA
- **Custom Swag** (`/custom-swag`) — Builder for magnets, keychains, NFC badges, or freeform custom orders
- **Robotics** (`/robotics`) — Coming Soon page
- **Cart** (`/cart`) — Cart with coupon codes
- **Order Success** (`/order-success`) — Post-checkout verification & confirmation
- **Nav:** Shop | Custom Print | Robotics (Soon) | Support

## Products (5 items in `lib/products.ts`)
1. **Stackable Organizer Box** (`stackable-organizer-box`) — $12.99, functional, new-product-1.jpg
   - Color picker: 10 Elegoo PLA + 12 Sunlu PLA colors (brand toggle in modal)
   - Divider option: with/without
   - Custom size: L×W×H in inches (checkbox reveals inputs; standard is 4″×3″×2″)
   - `colors`, `hasDividerOption`, `hasCustomSize` fields on Product
2. **Books Read This Year Tracker** (`books-read-tracker`) — $9.99, decorative, real photo
3. **Robot Apple Watch Charging Stand** (`robot-watch-stand`) — $9.99, functional, real photo
4. **PS5 DualSense Controller Stand** (`ps5-controller-stand`) — $9.99, gaming, real photos (3 images)
5. **Multi-Compartment Desk Organizer** (`desk-organizer`) — $9.99, functional, real photos (3 images)

## Custom Swag Page (`/custom-swag`)
Interactive builder with 4 swag types, each with product-specific preview:
- **Fridge Magnet** — Thick slab preview with depth/shadow effect, $5.00
- **Keychain** — Preview with metal ring/loop at top, $5.00
- **NFC Badge** — Landscape card preview with NFC icon overlay, $5.00
- **Custom** — Freeform quote form (name, email, description, optional file upload), submits to `/api/quote`

Builder features: shape selector (circle/rectangle/rounded), size selector (S/M/L), image upload with drag-and-drop, live preview, add to cart.

## Customizable Products Architecture
- `Product` interface has optional `colors?: FilamentColor[]`, `hasDividerOption?`, `hasCustomSize?`
- `CartItemCustomization` in `CartContext.tsx`: `{ color?, variant?, customDimensions? }`
- `CartItem.cartKey` = composite key (`productId|color-brand|variant|LxWxH`) for deduplication
- `addItem(product, customizations?)` — `removeItem(cartKey)` — `updateQuantity(cartKey, qty)`
- `buildItemName(item)` in cart page builds descriptive name for Square checkout (e.g. "Box — White (Elegoo) — With Divider — 6"×4"×3"")
- Custom size shows amber warning: "may vary in price — we'll confirm before processing"

## Recent Changes (newest first)
- 2026-03-02: Added Stackable Organizer Box product with full customization UI
  - Color picker with Elegoo (10 colors) / Sunlu (12 colors) brand toggle
  - With/without divider toggle
  - Custom size (L×W×H) inputs with standard size fallback (4″×3″×2″)
  - Cart shows color swatch + all customizations per item
  - CartContext refactored to support per-item customizations via cartKey
- 2026-02-28: Custom Swag page with product-specific previews, shop cleanup
  - Built `/custom-swag` with Magnet/Keychain/NFC Badge/Custom builders
  - Product-specific preview templates (depth for magnets, ring for keychains, NFC icon for badges)
  - Trimmed catalog from 20 to 3 core products
  - Removed category filter tabs
  - Added Custom Swag CTA card in shop grid
  - Updated nav: Shop | Custom Print | Robotics | Support
- 2026-02-28: Order verification on redirect (bypass unreliable Square webhooks)
  - Created `/api/verify-order` endpoint
  - Modified cart to save `squareOrderId` to sessionStorage
  - Modified success page to call verify-order on mount
- 2026-02-28: Replaced Stripe with Square payments
  - Square Payment Links API for hosted checkout
  - Added coupon codes (TESTFREE, FRIENDS50)
  - Configured Gmail email notifications
- 2026-02-26: Site redesign — 3D Printing + Robotics sections
- 2026-02-26: Added Swag category, ProductDetailModal with image carousel
- 2025-02-25: 5 new products with real photos, Appy's Studio logo favicon
- 2025-02-25: Moved production from Vercel to AWS EC2

## TODO
- Replace placeholder swag product photos (Instagram keychain, Nectar NFC tag photos coming)
- Add real robotics content when ready (currently Coming Soon)
- Replace remaining Unsplash stock images with real product photos (hero section)
- Add more products to catalog as they become available
- Add shipping cost calculation (options: flat rate ~$3, bake into price, or USPS API for real rates). Products ~500g/1.1lb, USPS Ground Advantage ~$4-9 depending on zone

## Square SDK Reference (`square` v44)

### Client Init
```typescript
import { SquareClient, SquareEnvironment } from 'square';
const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production'
    ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});
```

### Key API Methods
- **Create Payment Link:** `client.checkout.paymentLinks.create({ idempotencyKey, order, checkoutOptions, prePopulatedData })`
- **Get Order:** `client.orders.get({ orderId })`
- **Webhook Verify:** `await WebhooksHelper.verifySignature(body, signature, signatureKey, notificationUrl)` — must `await`, it's async
- **Money amounts:** BigInt cents — `BigInt(Math.round(price * 100))`

### Known Issues
- Square Payment Links do NOT reliably fire `payment.updated` webhooks — this is why we use verify-on-redirect
- 100% discount coupons create $0 orders processed as cash — no payment webhook fires
- Two Square apps exist; production payments use app `sq0idp-w46nJ_NCNDMSOywaCY0mwA` — webhook subscription must be on this app
- Production location ID: `L3RW8RJCN1V5J`
- If port 3001 is stuck on deploy: `sudo fuser -k 3001/tcp` then restart service
- Another service (freetools.us) runs on port 3000 on the same EC2 — don't disturb it

## Current State (as of 2026-02-28)
- Everything committed, pushed to GitHub, and deployed to production
- 3 products in shop + Custom Swag builder page
- Square payments working in production (verify-on-redirect flow)
- Gmail notifications active (appysstudioca@gmail.com)
- Production running on AWS EC2 with SSL at https://appysstudio.com
- Server `.env` has Square production credentials, Gmail, NextAuth configured
