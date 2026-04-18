# Appy's Studio — appysstudio.com

Next.js 16 + TypeScript e-commerce site for Appy's Studio (3D printing + robotics).
Production at **https://appysstudio.com** (AWS EC2).

> This repo replaces `jainapurva/printcraft-shop` (archived) and the static
> `appysstudio-website` GitHub Pages site (preserved on `archive/static-site`).

---

## Quick start

```bash
git clone git@github-jainapurva:jainapurva/appysstudio-website.git
cd appysstudio-website
npm install
cp .env.local.example .env.local   # fill in the values you need
npm run dev                         # http://localhost:3000
```

---

## Local development

### Common commands

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Start built app | `npm start` |
| Run tests | `npm test` |
| Type-check | `npx tsc --noEmit` |
| Lint | `npm run lint` |

### Environment variables

Local: `.env.local` (gitignored).  Production: `/opt/3dprints-shop/.env` on EC2.

All are optional for local dev — features that need them degrade gracefully
(e.g. emails no-op if Gmail creds missing). See `.env.local.example` for the
full list. Core groups:

- **Square** (`SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT`, `SQUARE_WEBHOOK_SIGNATURE_KEY`) — payments
- **Gmail** (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `OWNER_EMAIL`) — order notifications
- **NextAuth** (`NEXTAUTH_SECRET`) + OAuth providers (`GOOGLE_*`, `FACEBOOK_*`, `APPLE_*`)
- **Admin** (`ADMIN_PASSWORD`) — analytics dashboard

---

## Deploying to production

Production = systemd service **`appysstudio-website`** on port 3001, behind
nginx + Let's Encrypt SSL. `freetools.us` runs on port 3000 on the same EC2 —
**do not disturb it**.

### Deploy via CI (preferred)

Push a tag starting with `deploy-`. GitHub Actions builds and ships to EC2.

```bash
# typical flow
git pull                              # make sure you have latest
git push origin main                  # push your feature commits first
git tag deploy-$(date +%Y-%m-%d-%H%M) # e.g. deploy-2026-04-18-1430
git push origin --tags
```

Watch progress: https://github.com/jainapurva/appysstudio-website/actions

What the workflow does (`.github/workflows/deploy.yml`):
1. `npm ci --legacy-peer-deps` → `npm run build` (with `NEXT_PUBLIC_BASE_URL=https://appysstudio.com`)
2. Verifies `.next/standalone/server.js` exists (`next.config.ts` must keep `output: 'standalone'`)
3. rsyncs `.next/standalone/` → `/opt/3dprints-shop/` on EC2
4. rsyncs `.next/static/` → `/opt/3dprints-shop/.next/static/`
5. rsyncs `public/` → `/opt/3dprints-shop/public/`
6. `sudo systemctl restart appysstudio-website` + waits 3s
7. Verifies port 3001 is listening and `https://appysstudio.com/` returns 200
8. Fails the deploy if anything above fails

Typical run time: **~1 minute**.

### Manual deploy (fallback)

When CI is broken or you need to test a non-tagged build:

```bash
bash deploy_to_aws.sh
```

This does the same thing locally (build + rsync + restart). Requires the
deploy SSH key at `/media/ddarji/storage/.ssh/appysstudio_deploy` and
direct network access to EC2.

### Rollback

Two options:

```bash
# Option 1 — redeploy an older commit
git checkout <known-good-commit>
git tag deploy-rollback-$(date +%Y-%m-%d-%H%M)
git push origin --tags

# Option 2 — SSH to EC2 and revert the app dir from your most recent backup
# (if you took one before deploying)
```

There's no automatic blue/green. A bad deploy = ~1 minute to tag a redeploy of
the previous working commit.

---

## Operations

### Day-to-day commands

| What | Command |
|---|---|
| SSH to EC2 | `ssh -i /media/ddarji/storage/.ssh/appysstudio_deploy ubuntu@3.238.88.157` |
| Live logs | `sudo journalctl -u appysstudio-website -f` |
| Recent errors | `sudo journalctl -u appysstudio-website -p err -n 50 --no-pager` |
| Service status | `sudo systemctl status appysstudio-website` |
| Restart service | `sudo systemctl restart appysstudio-website` |
| Server app dir | `/opt/3dprints-shop/` (retained from pre-rename) |
| Server env file | `/opt/3dprints-shop/.env` |
| nginx config | `/etc/nginx/sites-available/appysstudio.com` |
| SSL renew (auto) | `sudo certbot renew` (cron handles this) |

### If port 3001 is stuck

```bash
sudo fuser -k 3001/tcp
sudo systemctl restart appysstudio-website
```

### Verify a deploy from the command line

```bash
curl -sI https://appysstudio.com/ | head -1              # expect 200
curl -s  https://appysstudio.com/api/orders | jq .       # live API check
```

---

## Project structure

```
app/                    Next.js App Router pages & API routes
  api/                  Server routes (checkout, verify-order, webhook, …)
  3d-generator/         3D model generator (WIP)
  cart/  order-success/ custom-swag/  robotics/  swayat/  …
components/             React components (ProductCard, Navbar, etc.)
context/                React context (CartContext)
lib/                    products catalog, orders, email, auth, analytics
data/                   JSON order storage (gitignored; prod data is on EC2)
public/products/        Product photos
__tests__/              Vitest tests
deploy_to_aws.sh        Manual deploy script (fallback)
.github/workflows/
  deploy.yml            CI deploy — triggered by `deploy-*` tags
```

---

## Gotchas

- **GitHub account:** this repo is under **`jainapurva`**, not `ddarji1409`.
  Git operations use the `github-jainapurva` SSH host alias
  (`~/.ssh/config`). `gh` CLI has both accounts — use
  `gh auth switch -u jainapurva` before running repo-scoped commands.
- **Next.js standalone output:** `next.config.ts` must keep
  `output: 'standalone'` — the deploy flow depends on it.
- **Square Payment Links don't reliably fire webhooks.** Order save happens
  via `app/api/verify-order/route.ts` on redirect, not via the webhook.
  100% discount coupons (`TESTFREE`) create $0 orders that never trigger
  any webhook at all.
- **Two Square apps exist** — production payments use
  `sq0idp-w46nJ_NCNDMSOywaCY0mwA`. Webhooks must be subscribed on that app.
  Location ID: `L3RW8RJCN1V5J`.
- **EC2 shared with freetools.us** on port 3000. Be careful with any
  firewall / nginx changes.
- **Merge main → tag:** CI deploys the commit the tag points to. Always
  push your `main` commits first, then tag.

---

## Roadmap

- [ ] User sign-in — Google/Facebook/Apple OAuth (backend ready, UI disabled)
- [ ] Color preview — preview products in different filament colors before ordering
- [ ] Shipping cost — destination-based rates (currently zone-based estimate)
- [ ] Per-product color options in listings
- [ ] Robotics product launches (Breadboard Dev Kit, Agentic Arduino — see `/robotics`)

## Contact

`appysstudioca@gmail.com`
