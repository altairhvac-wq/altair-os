# PWA and offline behaviour

**Altair OS is installable. It is not offline-capable.** Those are different
things, and the gap between them is deliberate.

This document exists because "it's a PWA" is routinely read as "it works
offline", and the next person to touch `public/sw.js` needs to know which one
was chosen and why.

## What exists

| Piece | Where | What it does |
| --- | --- | --- |
| Web app manifest | `app/manifest.ts` | name, icons, `display: standalone`, `start_url: /` — makes the app installable |
| Service worker | `public/sw.js` | 15 lines. `skipWaiting`, `clients.claim`, and a `fetch` handler that does `respondWith(fetch(event.request))` |
| Registration | `shared/components/pwa/PwaServiceWorkerRegistration.tsx` | registers the worker |
| Connectivity signal | `shared/hooks/useConnectivityStatus.ts` | reflects `navigator.onLine`, plus a brief `justReconnected` flag |
| Field banner | `shared/components/technician/TechnicianConnectivityBanner.tsx` | tells a technician they are offline |

## What does not exist

There is no app-shell cache, no cached data, no offline read, no offline
mutation queue, no outbox, no background sync, and no conflict resolution.
Nothing is written to IndexedDB. The hook says so itself — "Not a sync engine"
— and the worker says so: "Network-only — does not cache app or customer data."

Offline, the app does not load. A mutation attempted as the connection drops
fails with a network error and is not retried or queued; the user sees the
failure and retries by hand.

## Why network-only is the right default here

Altair is multi-tenant, and a cache is a place tenant data can outlive the
session that fetched it. A cached dashboard is a company's revenue, customer
list and job schedule sitting in the browser profile of whatever device
installed the app — a shared laptop in an office, a technician's personal
phone. `clear-site-data` on sign-out does not reach a service worker cache
unless someone remembers to clear it there too.

So the caching question is not "would offline be nice" — it would — but "which
data, scoped to which company, evicted on what event". Until that has an answer,
caching nothing is the safe default and the one in force.

## If offline support is added later

The load-bearing requirements, in the order they bite:

1. **Scope every cache entry to a company id**, and delete the whole cache on
   sign-out and on company switch. A response cached under one tenant must be
   unreachable from another.
2. **Never cache a mutation response**, and never serve a stale read where the
   user could act on it as if current — a stale invoice balance is a wrong
   payment.
3. **An offline mutation queue needs idempotency keys**, not just retry.
   `record_invoice_payment_atomic` already takes `p_idempotency_key`; a queue
   without one turns a flaky connection into duplicate payments.
4. **Decide conflict behaviour explicitly** — last-write-wins is a decision, not
   a default. `p_expected_updated_at` on the same RPC is the existing optimistic
   concurrency check and is the pattern to follow.
5. **Version the cache** so a deploy cannot serve a stale shell against a new
   API.

`scripts/verify-pwa-offline.mjs` asserts the current state so a caching worker
cannot land silently. It is a reminder to make these decisions, not a
prohibition — update it in the same change that adds the caching.
