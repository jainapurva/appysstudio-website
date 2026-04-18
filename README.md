# Appy's Studio — appysstudio.com

Next.js 16 + TypeScript e-commerce site for Appy's Studio (3D printing + robotics).
Deployed to AWS EC2 at **https://appysstudio.com**.

> This repo replaces the older `jainapurva/printcraft-shop` repo (now archived) and
> the static `appysstudio-website` GitHub Pages site (preserved on the
> `archive/static-site` branch).

## Local development

```bash
npm install
npm run dev
# → http://localhost:3000
```

Environment variables live in `.env.local` (not committed). See
`.env.local.example` for the full list (Square, Gmail, NextAuth, OAuth providers).

## Deploying to production

Production runs on AWS EC2 behind nginx, as systemd service
**`appysstudio-website`** on port `3001`.

**Deploy via CI (preferred):** push a tag starting with `deploy-`.

```bash
git tag deploy-2026-04-18-1
git push origin deploy-2026-04-18-1
```

GitHub Actions will SSH into EC2, pull main, build, and restart the service.
Watch progress in the repo's **Actions** tab.

**Manual deploy (fallback):** `bash deploy_to_aws.sh` from your local machine.
This builds locally and rsyncs the standalone build up.

## Key operations

| What | Command |
|---|---|
| SSH to EC2 | `ssh -i /media/ddarji/storage/.ssh/appysstudio_deploy ubuntu@3.238.88.157` |
| Live logs | `sudo journalctl -u appysstudio-website -f` |
| Restart service | `sudo systemctl restart appysstudio-website` |
| Server env file | `/opt/3dprints-shop/.env` (path retained from pre-rename) |

Another service (**freetools.us**) runs on port 3000 on the same EC2 — do not
disturb it when deploying.

## Project structure

- `app/` — Next.js App Router pages and API routes
- `components/` — React components
- `lib/` — Products catalog, orders, email, auth
- `data/` — JSON-based order storage (gitignored; production data lives on EC2)
- `public/products/` — Product photos
- `deploy_to_aws.sh` — Manual deploy script
- `.github/workflows/deploy.yml` — CI deploy triggered by `deploy-*` tags

## Roadmap

- [ ] User sign-in — Google/Facebook/Apple OAuth (backend ready, UI disabled)
- [ ] Color preview — preview products in different filament colors before ordering
- [ ] Shipping cost — destination-based rates (currently zone-based estimate)
- [ ] Per-product color options in listings
- [ ] Robotics product launches (Breadboard Dev Kit, Agentic Arduino — see `/robotics`)
