# Altair OS — Operations Execution Framework

> Unified background operations foundation: lifecycle, logging, context, timing, retry classification, and metrics hooks.  
> Location: `lib/operations/` (`executor.ts`, `operation.ts`, `result.ts`, `retry.ts`, `metrics.ts`)  
> Status: Infrastructure + one proof-of-concept cron integration

This is **not** a job queue, scheduler, or distributed worker system.

---

## Purpose

Several Altair systems perform asynchronous or boundary work (webhooks, cron, email, notifications, future AI). Before closed beta, they should share one reusable execution abstraction so every operation gets:

- Consistent lifecycle
- Structured logging (start / finish / failure / duration)
- Request / operation context
- Retry **classification** (no retries yet)
- Standardized `OperationResult`
- Pluggable metrics hooks (default no-op)

Business logic stays outside the framework. Call sites pass a callback; the executor wraps observability only.

Companion doc: [OPERATIONS_FOUNDATION.md](./OPERATIONS_FOUNDATION.md) (logger, correlation IDs, error taxonomy, serialization).

---

## What this is / is not

| This is | This is not |
|---------|-------------|
| Reusable `runOperation()` abstraction | Kafka / BullMQ / Redis queues |
| Lifecycle + logging + context | Temporal / distributed workers |
| Retry **classification** | Automatic retries |
| Metrics **hooks** (no-op today) | Prometheus / Datadog dashboards |
| Opt-in adoption | Mandatory migration of billing / payments |

---

## Module layout

```
lib/operations/
  executor.ts           # runOperation()
  operation.ts          # RunOperationInput / callback contract
  result.ts             # OperationResult + helpers
  retry.ts              # classifyRetryable (classify only)
  metrics.ts            # onOperationStarted / Finished / Failed (no-op default)
  …foundation modules…  # logger, errors, request-context, etc.
```

Import from the barrel:

```ts
import {
  runOperation,
  type OperationResult,
  classifyRetryable,
  setOperationMetricsHooks,
} from "@/lib/operations";
```

---

## Lifecycle

```
Operation
    ↓
Operation Context   (requestId, operation, companyId?, userId?)
    ↓
Structured Logger   (Operation started)
    ↓
Metrics             (onOperationStarted)
    ↓
Execution           (callback)
    ↓
Result              (OperationResult)
    ↓
Metrics             (onOperationFinished / onOperationFailed)
    ↓
Logger              (Operation completed | Operation failed)
    ↓
Return              (or throw when throwOnFailure: true)
```

No business logic belongs inside the framework.

---

## Result model

```ts
type OperationResult<T> = {
  success: boolean;
  durationMs: number;
  retryable: boolean;   // classification only
  operation: string;
  requestId: string;
  value?: T;
  error?: SerializedError;  // client-safe via serializeError()
};
```

Rules:

- Success → `value` set, `retryable: false`, no `error`
- Failure → `error` is always safe (no stacks / secrets / internal unknown messages)
- Never leak raw `Error.message` from unknown failures through `OperationResult.error`

---

## Retry philosophy

**Classify. Do not retry.**

| Error class / category | Retryable |
|------------------------|-----------|
| `ValidationError` | Never |
| `AuthorizationError` | Never |
| `NotFoundError` | Never |
| `ConflictError` | Never |
| `UnexpectedError` | Never |
| `ExternalServiceError` | Yes |
| `InfrastructureError` | Yes |
| Non-Altair / unknown | Never (default) |

`classifyRetryable(error)` reads `AltairError.retryable` when present. Future queues may consume `OperationResult.retryable`; this framework will not enqueue or re-invoke callbacks.

---

## Metrics philosophy

Lightweight callbacks only:

- `onOperationStarted(event)`
- `onOperationFinished(event)`
- `onOperationFailed(event)`

Default: **no-op**.

Replace later without changing call sites:

```ts
import { setOperationMetricsHooks } from "@/lib/operations";

setOperationMetricsHooks({
  onOperationStarted(event) {
    // e.g. counter.inc({ operation: event.operation })
  },
  onOperationFinished(event) {
    // e.g. histogram.observe(event.durationMs)
  },
  onOperationFailed(event) {
    // e.g. failure counter
  },
});
```

Targets for later adapters: Prometheus, OpenTelemetry, Datadog, etc. No dashboards ship with this foundation.

---

## Logging

Every `runOperation()` emits structured logs automatically:

| Event | Level | Message |
|-------|-------|---------|
| Start | `info` | `Operation started` |
| Success | `info` | `Operation completed` |
| Failure | `error` | `Operation failed` |

Each log includes `requestId`, `operation`, `durationMs` (on finish), and ambient `companyId` / `userId` / `route` when available. Call sites should not duplicate this boilerplate.

---

## Context

`runOperation` builds an `OperationContext` and binds AsyncLocalStorage via `runWithRequestContext`, so nested code can read `getRequestId()` / `getRequestContext()`.

Attached when available:

- `requestId` (generated if missing)
- `operation` (from `operationName`)
- `companyId`
- `userId`
- `route`

---

## Error handling

- Failures are serialized with `serializeError()` onto `OperationResult.error`
- Internal details stay in the structured log via `serializeErrorForLog` (logger path)
- `throwOnFailure: false` (default) → return failed `OperationResult`
- `throwOnFailure: true` → log + metrics, then rethrow the **original** error

---

## Examples

### Basic (return result)

```ts
const result = await runOperation({
  operationName: "cron.workflow_reminders.evaluate",
  context: {
    requestId,
    route: "/api/cron/workflow-reminders",
  },
  callback: async (ctx) => {
    // existing business logic — unchanged
    return { ok: true };
  },
});

if (!result.success) {
  // use result.error (safe) + result.retryable (classification)
}
```

### Throw on failure

```ts
await runOperation({
  operationName: "email.send",
  throwOnFailure: true,
  context: { companyId, userId },
  callback: async () => {
    await sendEmail(...);
  },
});
```

### Proof-of-concept adoption

The workflow reminders cron route (`app/api/cron/workflow-reminders/route.ts`) wraps authorized evaluation work in `runOperation`. Auth / secret checks stay outside. HTTP responses and reminder evaluation behavior are unchanged; logging and metrics are additive.

Billing, Stripe Connect payments, and customer workflows are **not** migrated in this phase.

---

## Future queue integration

When Altair eventually needs durable async work:

1. Keep using `runOperation` inside the worker / handler
2. Persist or enqueue jobs elsewhere (separate system)
3. Use `OperationResult.retryable` to decide whether to re-enqueue
4. Propagate `requestId` into the job payload for correlation

The execution framework stays the observability boundary. A queue would be an **optional consumer**, not a replacement for `runOperation`.

Do not introduce Redis, BullMQ, Temporal, Kafka, or background daemons until product scale clearly requires them.

---

## Strict non-goals

Do **not** build into this layer:

- Queues / workers / Redis / BullMQ / Temporal / Kafka
- Background daemons or a custom scheduler
- Automatic retries or retry persistence
- Operation dashboards
- Changes to billing, payments, jobs, invoices, estimates, search, or auth business logic

---

## Adoption guidance

1. Prefer new or low-risk boundaries first (cron, internal automation)
2. Keep domain code in the callback
3. Pass `companyId` / `userId` when known
4. Rely on executor logs — avoid duplicate start/finish logging
5. Migrate billing / Connect only in a dedicated, carefully reviewed change
