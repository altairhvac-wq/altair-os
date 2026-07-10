# Stripe payments beta QA checklist

Internal checklist for Altair OS Stripe online invoice payments and manual payment recording. Do not store secret values in this file.

## Vercel env reminder

Confirm these are set in the production (and preview, if used) Vercel project:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

Also required for public payment links / checkout redirects:

- `NEXT_PUBLIC_APP_URL` (or equivalent app base URL used by the app)

Never paste secret values into tickets, chat, or this doc.

## Stripe Dashboard reminder

- Webhook destination must be for **Connected accounts** (not only “Your account”).
- Subscribed events must include `checkout.session.completed`.
- An old “Your account” webhook should **not** point at the same URL with the wrong signing secret.
- Endpoint URL should be the Altair payments webhook route (e.g. `/api/webhooks/payments`).

## Manual payment test

1. Open an unpaid invoice with a balance due.
2. Click **Record payment**.
3. Confirm the modal appears above any invoice overlay.
4. Try amount `0` or negative → blocked with a clear error.
5. Try amount greater than balance due → blocked with a clear error.
6. Record a valid partial payment (cash/check/card/ACH/other).
7. Confirm:
   - One payment row appears in payment history.
   - Invoice status becomes partially paid (or paid if full balance).
   - Balance due decreases correctly.
   - Loading/pending state clears after success.
8. Refresh the invoice page and confirm status/history stay correct.

## Public invoice Stripe payment test

1. Create/send an unpaid invoice.
2. Open the public invoice payment link from email (or generated link).
3. Confirm **Pay Now** shows the remaining balance only.
4. Complete Stripe Checkout with test card `4242 4242 4242 4242`.
5. Return to the success URL.
6. Confirm the invoice updates to paid (or partially paid if only part of balance was due).
7. Refresh the public payment page:
   - Shows paid / no duplicate Pay Now path when fully paid.
   - Does not start a new Checkout session for a fully paid invoice.

## Partially paid invoice state test

1. Record a manual partial payment on an invoice.
2. Open/create a public payment link for the same invoice.
3. Confirm Checkout / Pay Now amount equals **remaining balance only**.
4. Pay the remainder via Stripe test card.
5. Confirm invoice becomes paid and public page shows paid state.

## Paid invoice state test

1. Fully pay an invoice (manual or Stripe).
2. Attempt admin/internal Checkout if available → blocked.
3. Open public payment link → paid state, no Pay Now checkout path.
4. Confirm void/cancelled invoices (if present) cannot start Checkout and public view is unavailable.

## Connected account webhook test

1. Complete a Stripe Checkout payment on a connected Express account.
2. In Stripe Dashboard → Webhooks (Connected accounts), confirm `checkout.session.completed` delivery succeeded.
3. Confirm Altair invoice payment row source/provider is Stripe.
4. Confirm invoice amount paid / balance due / status updated.

## Duplicate webhook / idempotency test

1. After a successful Stripe payment is recorded, resend the same `checkout.session.completed` event from Stripe Dashboard (or wait for Stripe retry if a prior attempt failed after recording).
2. Confirm:
   - No duplicate `invoice_payments` row.
   - Invoice totals do not double-count.
   - `payment_provider_events` shows the event as processed/ignored/skipped safely (no second payment).

## Failed webhook troubleshooting notes

Safe checks only (no secrets, no full payloads, no card data):

1. Confirm `STRIPE_WEBHOOK_SECRET` matches the Connected accounts endpoint signing secret in Stripe.
2. Confirm webhook is Connected accounts destination and includes `checkout.session.completed`.
3. Check Vercel/function logs for:
   - signature verification failed
   - missing connected account context
   - amount mismatch / invoice not payable
   - RPC / recording failures
4. Inspect `payment_provider_events` for the Stripe event id:
   - `received` / `processing` / `processed` / `failed` / `ignored`
   - `error_message` (sanitized operational text only)
5. If payment succeeded in Stripe but invoice unpaid:
   - Verify connected account id matches `company_payment_accounts.provider_account_id`
   - Verify checkout session metadata includes `company_id`, `invoice_id`, `purpose=invoice_payment`, `provider=stripe`
   - Verify session `amount_total` matches invoice balance due in cents at recording time
6. Do not use the browser success page as source of truth; webhook + `record_invoice_payment_atomic` is the recording path.

## Sign-off

| Check | Pass? | Notes |
| --- | --- | --- |
| Manual payment | | |
| Public Stripe payment | | |
| Connected account webhook | | |
| Duplicate/idempotency | | |
| Paid invoice state | | |
| Partially paid remaining balance | | |
| Env + Dashboard reminders reviewed | | |
