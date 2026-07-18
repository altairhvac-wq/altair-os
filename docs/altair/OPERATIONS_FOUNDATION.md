# Altair OS — Operations Foundation

> Structured logging, request correlation IDs, error taxonomy, and safe serialization.  
> Location: `lib/operations/`  
> Status: Foundation only (no mandatory migration of existing call sites)

This document is the adoption guide for Altair’s production operations infrastructure. It does **not** cover dashboards, Sentry, OpenTelemetry, or external log providers.

---

## Purpose

As Altair approaches closed beta, production-critical paths (auth, membership, jobs, estimates, invoices, Stripe Connect, SaaS billing, webhooks) need a single, lightweight observability foundation.

Goals:

- Structured, production-safe logging
- Per-request correlation IDs
- Standardized error taxonomy
- Safe error serialization for clients and logs
- Reusable operation context and optional duration timing

Non-goals:

- Changing business behavior
- Mandatory refactors of existing modules
- Monitoring product UI
- External APM / log shipping integrations

---

## Module layout

```
lib/operations/
  constants.ts          # Header names, error codes, redaction patterns
  types.ts              # Shared types
  request-context.ts    # Request IDs + AsyncLocalStorage helpers
  operation-context.ts  # Operation context + timing helpers
  errors.ts             # Error taxonomy classes
  serialize-error.ts    # Client-safe + log serialization / redaction
  logger.ts             # Structured logger
  index.ts              # Public exports
```

Import from the barrel:

```ts
import {
  logger,
  createRequestId,
  runWithRequestContext,
  createOperationContext,
  startOperation,
  withOperation,
  ValidationError,
  serializeError,
} from "@/lib/operations";
```

All modules that touch console / AsyncLocalStorage are `server-only`.

---

## Logging conventions

### Always structured

```ts
logger.info("Checkout created", {
  companyId,
  userId,
  requestId,
  operation: "saas.checkout.create",
  durationMs,
  meta: { planKey },
});
```

Rules:

- Message is a short, stable human string (no interpolated IDs).
- Identifiers and dimensions go in structured fields / `meta`.
- Prefer internal IDs already used across Altair (`companyId`, `userId`, `requestId`).
- Never log secrets, JWTs, API keys, Stripe payloads, raw webhook bodies, card data, or customer PII beyond those internal IDs.

### Levels

| Level | Use |
|-------|-----|
| `debug` | Development diagnostics only (no-op in production) |
| `info` | Successful / expected operational events |
| `warn` | Recoverable anomalies, degraded paths |
| `error` | Failures that need attention |

### Child loggers

```ts
const log = logger.child({
  requestId,
  operation: "payments.webhook.process",
});

log.info("Event claimed", { meta: { providerEventId } });
```

### Output shape

Logs are single-line JSON to the process console (Vercel / Node stdout):

```json
{
  "level": "info",
  "message": "Checkout created",
  "ts": "2026-07-18T23:00:00.000Z",
  "requestId": "…",
  "companyId": "…",
  "userId": "…",
  "operation": "saas.checkout.create",
  "durationMs": 42,
  "meta": { "planKey": "starter" }
}
```

Sensitive keys in `meta` are redacted automatically.

---

## Request correlation IDs

Every logical request should have one opaque `requestId` (UUID).

### Helpers

| Helper | Behavior |
|--------|----------|
| `createRequestId()` | New UUID |
| `requestIdFromHeaders(headers)` | Read `x-request-id` or `x-correlation-id` |
| `resolveRequestId(existing?)` | Prefer existing → ALS → new |
| `getRequestId()` | Read from AsyncLocalStorage |
| `getOrCreateRequestId()` | ALS or new (does not bind ALS) |
| `runWithRequestContext(input, fn)` | Bind ALS for nested calls |
| `updateRequestContext(patch)` | Enrich active ALS store |

### Boundary pattern (route handler / webhook / cron)

```ts
import {
  createRequestId,
  logger,
  requestIdFromHeaders,
  runWithRequestContext,
} from "@/lib/operations";

export async function POST(request: Request) {
  const requestId =
    requestIdFromHeaders(request.headers) ?? createRequestId();

  return runWithRequestContext(
    { requestId, route: "/api/webhooks/billing", operation: "billing.webhook" },
    async () => {
      logger.info("Webhook received", {
        requestId,
        operation: "billing.webhook",
      });
      // existing business logic unchanged
    },
  );
}
```

### Server action pattern

```ts
const requestId = createRequestId();

return runWithRequestContext(
  { requestId, operation: "jobs.updateStatus", userId, companyId },
  async () => {
    // …
  },
);
```

### Future propagation

The same helpers support:

- Stripe / billing webhooks
- Background jobs
- Cron routes
- Downstream Stripe API calls (pass `requestId` in log meta only — never as a Stripe secret)

Middleware wiring is **optional**. This foundation does not require middleware changes.

---

## Operation context

```ts
type OperationContext = {
  requestId: string;
  companyId?: string;
  userId?: string;
  route?: string;
  operation?: string;
  startedAt: number;
};
```

### Create

```ts
const ctx = createOperationContext({
  operation: "invoices.send",
  companyId,
  userId,
});
```

### Timing

```ts
const op = startOperation({
  operation: "billing.webhook.process",
  requestId,
});

try {
  // work
  op.finish({ message: "Billing webhook processed" });
} catch (error) {
  op.finish({
    level: "error",
    message: "Billing webhook failed",
    error,
  });
  throw error;
}
```

Or:

```ts
await withOperation(
  { operation: "payments.webhook.process", requestId },
  async (ctx) => {
    // work — ALS bound; duration logged on success/failure
  },
);
```

---

## Error taxonomy

| Class | Category | Default retryable | Typical use |
|-------|----------|-------------------|-------------|
| `ValidationError` | `validation` | `false` | Bad input |
| `AuthorizationError` | `authorization` | `false` | AuthZ / permission denials |
| `NotFoundError` | `not_found` | `false` | Missing resource |
| `ConflictError` | `conflict` | `false` | State conflicts / duplicates |
| `ExternalServiceError` | `external_service` | `true` | Stripe, email, SMS, etc. |
| `InfrastructureError` | `infrastructure` | `true` | DB / platform failures |
| `UnexpectedError` | `unexpected` | `false` | Catch-all |

Every Altair error exposes:

- `code` — stable machine code (`VALIDATION_ERROR`, …)
- `category` — taxonomy bucket
- `retryable` — whether a retry may help
- `safeMessage` — user-safe message

```ts
throw new NotFoundError({
  safeMessage: "Invoice not found.",
  details: { invoiceId },
});
```

Use `isAltairError(error)` for type narrowing. Domain-specific errors (e.g. webhook verification errors) may remain local; wrap or map them at boundaries when adopting the taxonomy.

---

## Serialization rules

### `serializeError(error)` — client / action results

- Altair errors → `{ code, category, message: safeMessage, retryable }`
- Anything else → generic unexpected payload
- **Never** includes stack traces, SQL, tokens, or internal `Error.message` from unknown errors

### `serializeErrorForLog(error)` — logs only

- Includes name, taxonomy fields, redacted `details`
- Stack traces only when `NODE_ENV === "development"` (or `includeStack: true`)
- Nested `cause` is serialized recursively with the same rules

### Redaction

`redactMeta()` strips keys matching patterns such as `password`, `token`, `secret`, `authorization`, `api_key`, `jwt`, `webhook_secret`, Stripe secret/payload keys, card fields, etc.

---

## Webhook adoption (non-breaking)

Billing and payments webhooks must **not** change business logic in this phase.

When adopting later, wrap the existing handler body:

```ts
const requestId =
  requestIdFromHeaders(request.headers) ?? createRequestId();

return runWithRequestContext(
  {
    requestId,
    route: "/api/webhooks/payments",
    operation: "payments.webhook",
  },
  async () => {
    const op = startOperation({
      requestId,
      operation: "payments.webhook",
    });
    try {
      // existing verify → claim → process flow unchanged
      op.finish({ message: "Payments webhook handled" });
      return response;
    } catch (error) {
      op.finish({
        level: "error",
        message: "Payments webhook failed",
        error,
      });
      throw error;
    }
  },
);
```

Verification, claim, ledger, and Stripe processing stay identical. Logging is additive only.

---

## Server action / layout adoption

No mandatory migration. Prefer:

1. Create `requestId` at the action boundary
2. `runWithRequestContext` when nested helpers should share it
3. Log with `logger.*` and structured fields
4. Throw `AltairError` subclasses (or map at the edge with `serializeError`)

Layouts may resolve company/user IDs and pass them into child operation contexts; they should not become a logging bottleneck.

---

## Security protections

- Production `debug` logs are suppressed
- Metadata redaction on every log write
- Client serialization never leaks stacks or unknown internal messages
- No Stripe event bodies, webhook secrets, or payment instrument data in log fields
- Prefer IDs already used for tenancy (`companyId`, `userId`) over emails / names / phone numbers

---

## Performance considerations

- Logger does a shallow JSON stringify of small records — keep `meta` small
- AsyncLocalStorage is request-scoped and cheap relative to DB / Stripe I/O
- `debug` is a no-op in production
- Timing helpers use `Date.now()` only — no timers left running
- Adoption is opt-in; unused foundation code has no runtime cost on existing paths

---

## Future work (out of scope here)

- Optional middleware injection of `x-request-id`
- Gradual replacement of ad-hoc `console.error` call sites
- Log shipping / alerting integrations
- Dashboards and SLOs

Adopt incrementally at new or high-risk boundaries first (webhooks, billing, payments, auth).
