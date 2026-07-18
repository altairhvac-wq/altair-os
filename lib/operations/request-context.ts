import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import {
  REQUEST_ID_HEADER,
  REQUEST_ID_HEADER_ALT,
} from "@/lib/operations/constants";
import type { OperationContext } from "@/lib/operations/types";

type RequestContextStore = {
  requestId: string;
  companyId?: string;
  userId?: string;
  route?: string;
  operation?: string;
  startedAt: number;
};

const requestContextStorage = new AsyncLocalStorage<RequestContextStore>();

/**
 * Creates a new opaque request / correlation ID.
 * Safe to call from route handlers, server actions, webhooks, and cron jobs.
 */
export function createRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Reads an inbound correlation ID from Headers (NextRequest, fetch Headers, etc.).
 * Does not generate a new ID when missing.
 */
export function requestIdFromHeaders(
  headers: Headers | { get(name: string): string | null },
): string | undefined {
  const primary = headers.get(REQUEST_ID_HEADER)?.trim();
  if (primary) {
    return primary;
  }

  const alternate = headers.get(REQUEST_ID_HEADER_ALT)?.trim();
  return alternate || undefined;
}

/**
 * Resolves a request ID: prefers an explicit value, then ALS store, then a new ID.
 * Generating a new ID here does not bind it to ALS — use runWithRequestContext for that.
 */
export function resolveRequestId(existing?: string | null): string {
  const trimmed = existing?.trim();
  if (trimmed) {
    return trimmed;
  }

  return getRequestId() ?? createRequestId();
}

/** Returns the request ID from the active async context, if any. */
export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

/**
 * Returns the active request ID or creates one without entering ALS.
 * Prefer runWithRequestContext at request boundaries so descendants share the same ID.
 */
export function getOrCreateRequestId(): string {
  return getRequestId() ?? createRequestId();
}

/** Returns a shallow copy of the active request store, if present. */
export function getRequestContext(): RequestContextStore | undefined {
  const store = requestContextStorage.getStore();
  if (!store) {
    return undefined;
  }

  return { ...store };
}

/**
 * Runs `fn` inside an AsyncLocalStorage scope so nested calls can read requestId
 * and related fields via getRequestId / getRequestContext.
 *
 * Compatible with route handlers, server actions, webhooks, and background jobs —
 * call at the boundary; do not require middleware changes.
 */
export function runWithRequestContext<T>(
  input: {
    requestId?: string;
    companyId?: string;
    userId?: string;
    route?: string;
    operation?: string;
    startedAt?: number;
  },
  fn: () => T,
): T {
  const parent = requestContextStorage.getStore();
  const store: RequestContextStore = {
    requestId: resolveRequestId(input.requestId ?? parent?.requestId),
    companyId: input.companyId ?? parent?.companyId,
    userId: input.userId ?? parent?.userId,
    route: input.route ?? parent?.route,
    operation: input.operation ?? parent?.operation,
    startedAt: input.startedAt ?? parent?.startedAt ?? Date.now(),
  };

  return requestContextStorage.run(store, fn);
}

/**
 * Merges additional fields into the active store for the remainder of the current scope.
 * No-op when there is no active request context.
 */
export function updateRequestContext(
  patch: Partial<Omit<RequestContextStore, "requestId" | "startedAt">> & {
    requestId?: string;
  },
): void {
  const store = requestContextStorage.getStore();
  if (!store) {
    return;
  }

  if (patch.requestId?.trim()) {
    store.requestId = patch.requestId.trim();
  }
  if (patch.companyId !== undefined) {
    store.companyId = patch.companyId;
  }
  if (patch.userId !== undefined) {
    store.userId = patch.userId;
  }
  if (patch.route !== undefined) {
    store.route = patch.route;
  }
  if (patch.operation !== undefined) {
    store.operation = patch.operation;
  }
}

/**
 * Builds an OperationContext from the active ALS store, generating a requestId
 * when none is active (without binding ALS).
 */
export function operationContextFromRequest(
  overrides?: Partial<OperationContext>,
): OperationContext {
  const store = getRequestContext();

  return {
    requestId: overrides?.requestId ?? store?.requestId ?? createRequestId(),
    companyId: overrides?.companyId ?? store?.companyId,
    userId: overrides?.userId ?? store?.userId,
    route: overrides?.route ?? store?.route,
    operation: overrides?.operation ?? store?.operation,
    startedAt: overrides?.startedAt ?? store?.startedAt ?? Date.now(),
  };
}
