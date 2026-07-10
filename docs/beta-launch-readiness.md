# Beta Launch Readiness

Audit-first checklist for a small HVAC/trades beta company: signup through getting paid.

Do not treat this as a feature roadmap. Scope is core workflow only.

---

## Core workflow checklist

Use this as the manual smoke path for each beta tenant.

- [ ] Sign up with company name + trade
- [ ] Land on dashboard (owner) with an active company
- [ ] Log out / log in redirects correctly (owner → `/`, technician → `/technician`)
- [ ] Forgot password email sends; reset password form loads and updates password
- [ ] Settings: company profile visible; billing defaults editable; Stripe status clear
- [ ] Invite a team member (technician or office)
- [ ] Create a customer
- [ ] Open customer detail (Customer 360)
- [ ] Create a job for that customer
- [ ] Update job status / assign technician
- [ ] Create an estimate with line items; totals look correct
- [ ] Send estimate / approve (office or public approval link)
- [ ] Convert approved estimate to invoice (if using that path)
- [ ] Create invoice (or open converted invoice)
- [ ] Send / open public invoice payment link
- [ ] Record a manual payment
- [ ] Confirm Stripe payment updates invoice status (paid / partially paid)
- [ ] Technician mobile: see assigned jobs only; open job; complete job
- [ ] Reports page loads; empty or populated totals do not crash
- [ ] Technician cannot open Settings / admin-only areas

---

## Known working areas

Verified by code audit (and prior Stripe hardening), pending live smoke confirmation:

| Area | Notes |
|------|--------|
| Signup → owner company bootstrap | Creates company + owner membership + `default_company_id` |
| Login / role redirects | Technicians → `/technician`; owners/admins → `/` |
| Forgot-password request UX | Generic success; rate-limit handling |
| Settings RBAC | Owner/admin only; technicians redirected to tech shell |
| Stripe Connect status card | Clear connected / pending / not connected states |
| Customers CRUD + 360 | Company-scoped; empty states present |
| Jobs create/update/status | Dispatch + technician assignment path present |
| Estimates create + office status | Line items/totals; public approval; convert → invoice |
| Invoices + manual payment | Payable guards; payment history; paid state |
| Public invoice Pay Now | Token route; no Pay Now when fully paid |
| Stripe Checkout → invoice update | Webhook path hardened in prior pass |
| Technician home | Assigned jobs; completion notes/photos optional |
| Reports | Auth-gated; empty states; company-scoped |
| Service role | Server-only (`server-only` import); no client usage |
| Public token routes | `/invoice-payment/*`, `/estimate-approval/*` public + token-scoped |

---

## Known risks

| Severity | Risk | Guidance |
|----------|------|----------|
| **High (ops)** | Connected-account Stripe webhook misconfigured | See Stripe notes below — blocks online payments |
| **Medium** | Technician field estimates: insert allowed, but RLS may block read/on-site approve | Prefer office create/approve for beta, or fix RLS in a follow-up |
| **Medium** | Company profile is view-only | Name/contact set at signup/setup; no in-app edit yet |
| **Medium** | No estimate edit after create | Cancel draft and recreate if line items are wrong |
| **Low** | Reports load full company datasets in memory | Fine for small beta tenants; revisit at scale |
| **Low** | Job completion notes/photos optional; no job closeout signature | Product acceptable for beta unless required |
| **Low** | Middleware company context uses server cookie helpers | Watch for rare Edge flakiness on auth redirects |
| **Low** | Office staff cannot open Settings | By design today (`manageCompany` required) |

Large issues above are **report-only** for this pass — do not expand scope mid-beta.

---

## Manual test steps

### Auth

1. Sign up a new owner → confirm company exists and dashboard loads.
2. Log out → log in → land on `/`.
3. Request password reset → open email link → set new password on `/reset-password` → log in with new password.
4. Invite a technician → accept invite → confirm redirect to `/technician`.

### Office workflow

1. Settings → confirm company profile + Stripe card readable.
2. Customers → create → open detail.
3. Jobs → create for customer → change status / assign tech.
4. Estimates → create with ≥1 line item → send → approve (or public link).
5. Convert approved estimate to invoice **or** create invoice directly.
6. Open invoice → confirm unpaid / balance due.
7. Record manual partial payment → status becomes partially paid.
8. Record remaining balance (or Stripe Pay Now) → paid; Pay Now hidden on public page.

### Technician

1. As technician, open `/technician`.
2. Confirm only assigned jobs appear.
3. Open a job → complete with optional notes/photos.
4. Confirm Settings is not accessible.

### Reports / permissions

1. As owner, open Reports → page loads.
2. As technician, confirm admin routes redirect or show unauthorized.

---

## Stripe notes

Operational requirements (no secrets in this doc):

1. **Connected accounts webhook must be active** for the Altair payments endpoint.
2. Event **`checkout.session.completed`** must be selected on that webhook.
3. **`STRIPE_WEBHOOK_SECRET`** in the deploy environment must match the **connected-account** webhook destination signing secret.
4. Do **not** point an old “Your account” (platform) webhook at the same URL with a different/wrong secret — signature verification will fail and invoice status will not update.
5. After Connect onboarding, confirm Settings shows charges enabled / online payments enabled as expected.
6. Full payment QA checklist: [`docs/stripe-payments-beta-qa.md`](./stripe-payments-beta-qa.md).

Never commit or paste live webhook secrets, API keys, or service-role keys into docs or tickets.

---

## Vercel deploy reminder

Production deploy:

```bash
npx vercel --prod
```

Confirm env vars on the production project (Supabase, Stripe publishable/secret, Connect, webhook secret, app URL) before inviting beta users.

---

## Fixes applied in this readiness pass

- Allow authenticated users to stay on `/reset-password` (middleware was redirecting recovery sessions away).
- Clarify company setup copy (removed “change later” promise).
- Label company profile as view-only for beta.
- Surface Stripe settings load failures instead of silently looking “not connected”.
- Hide internal Stripe test checkout button in production builds.
- Scope estimate→invoice convert rollback delete by `company_id`.

---

## Sign-off

| Check | Owner | Date | Result |
|-------|-------|------|--------|
| Core workflow smoke (above) | | | |
| Stripe connected webhook verified | | | |
| `npx tsc --noEmit` | | | |
| `npm run build` | | | |
| `npx vercel --prod` | | | |
