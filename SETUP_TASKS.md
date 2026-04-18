# Appy's Studio Shop — Setup Tasks

Your shop is live at: **https://appysstudio.com**
GitHub repo: **https://github.com/jainapurva/printcraft-shop**

All environment variables are currently set to **placeholders**. The site loads but payments/emails won't work until you replace them with real values.

---

## Tasks to Complete

### 1. Set up Square (Payments)
Square handles checkout and order payments.

- [ ] Create a Square Developer account at https://developer.squareup.com
- [ ] Create an application in the Developer Console
- [ ] Go to **Credentials** tab
- [ ] Copy your **Access Token**
- [ ] Go to **Locations** tab and copy your **Location ID**
- [ ] Go to **Webhooks** tab > **Add Subscription**
  - URL: `https://appysstudio.com/api/webhook`
  - Events to subscribe: `payment.updated`
  - Copy the **Webhook Signature Key**

**Update on server (.env):**

| Variable | Value |
|----------|-------|
| `SQUARE_ACCESS_TOKEN` | Your access token |
| `SQUARE_LOCATION_ID` | Your location ID |
| `SQUARE_ENVIRONMENT` | `sandbox` (testing) or `production` (live) |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Your webhook signature key |

> **Tip:** Use sandbox credentials first to verify everything works before switching to production.

---

### 2. Set up Gmail (Emails)
Emails (order confirmations, quote notifications) are sent via Gmail using Nodemailer.

- [ ] Enable **2-Step Verification** on the Gmail account: https://myaccount.google.com/signinoptions/two-step-verification
- [ ] Generate an **App Password**: https://myaccount.google.com/apppasswords
  - Select app: "Mail", device: "Other" (enter "Appy's Studio")
  - Copy the 16-character password

**Update on server (.env):**

| Variable | Value |
|----------|-------|
| `GMAIL_USER` | Your Gmail address (e.g. `apurvajain.kota@gmail.com`) |
| `GMAIL_APP_PASSWORD` | The 16-character app password from above |
| `OWNER_EMAIL` | Your email for order notifications (optional, defaults to `apurvajain.kota@gmail.com`) |

> **Note:** Emails will be sent from the Gmail address. No domain verification needed.

---

### 3. Set Base URL
- [ ] Update `NEXT_PUBLIC_BASE_URL` to your domain (e.g., `https://appysstudio.com`)

---

### 4. Set Admin Password (Optional)
The `/admin` page is protected by a password.

| Variable | Value |
|----------|-------|
| `ADMIN_PASSWORD` | Change from default `printcraft2025` to something secure |

---

## Quick Summary

| Service | What it does | Sign up |
|---------|-------------|---------|
| Square | Payments & checkout | https://developer.squareup.com |
| Gmail | Transactional emails | Your own Gmail account |

---

## Current Env Vars (all placeholders)

```
SQUARE_ACCESS_TOKEN=
SQUARE_LOCATION_ID=
SQUARE_ENVIRONMENT=sandbox
SQUARE_WEBHOOK_SIGNATURE_KEY=
GMAIL_USER=placeholder
GMAIL_APP_PASSWORD=placeholder
NEXT_PUBLIC_BASE_URL=https://appysstudio.com
ADMIN_PASSWORD=printcraft2025
```

Replace each one with real values from the services above, then restart the service.
