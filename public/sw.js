/**
 * Minimal service worker for PWA installability only.
 * Network-only — does not cache app or customer data.
 *
 * Only same-origin GET requests are handled, and only by passing them straight
 * to the network. Everything else (cross-origin requests, POSTs) is left to
 * the browser by not calling respondWith at all.
 *
 * Why the restriction: re-fetching a cross-origin request from inside the
 * worker changes how the browser treats it. The Cloudflare Turnstile script
 * on the signup, login and reset forms answers with a redirect, and
 * re-fetched through this worker it failed with net::ERR_FAILED, so the
 * security check never ran and the forms stayed locked for anyone with the
 * worker installed. Supabase and Stripe calls were proxied the same way for
 * no benefit (launch audit M11).
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(fetch(event.request));
});
