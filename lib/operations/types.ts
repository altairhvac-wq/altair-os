/**
 * Shared types for the Altair operations foundation.
 * Infrastructure only — no domain/business types.
 */

/** Structured log severity levels. */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Arbitrary structured metadata for logs.
 * Prefer scalar IDs and short enums; never put secrets or Stripe payloads here.
 */
export type LogMeta = Record<string, unknown>;

/** High-level error categories for taxonomy and client serialization. */
export type ErrorCategory =
  | "validation"
  | "authorization"
  | "not_found"
  | "conflict"
  | "external_service"
  | "infrastructure"
  | "unexpected";

/**
 * Reusable ambient context for a single logical operation.
 * Safe to pass into loggers; contains only internal identifiers and labels.
 */
export type OperationContext = {
  requestId: string;
  companyId?: string;
  userId?: string;
  route?: string;
  operation?: string;
  startedAt: number;
};

/** Partial fields used when creating or extending an operation context. */
export type OperationContextInput = {
  requestId?: string;
  companyId?: string;
  userId?: string;
  route?: string;
  operation?: string;
  startedAt?: number;
};

/** Client-safe error payload — never includes stack traces or secrets. */
export type SerializedError = {
  code: string;
  category: ErrorCategory;
  message: string;
  retryable: boolean;
};

/**
 * Log-oriented error payload.
 * Stack traces are included only when explicitly enabled (typically development).
 */
export type SerializedErrorForLog = SerializedError & {
  name: string;
  stack?: string;
  cause?: SerializedErrorForLog;
  details?: LogMeta;
};

/** Options for finishing a timed operation. */
export type OperationFinishOptions = {
  level?: LogLevel;
  message?: string;
  meta?: LogMeta;
  error?: unknown;
};

/** Handle returned by startOperation for duration logging. */
export type TimedOperation = {
  context: OperationContext;
  finish: (options?: OperationFinishOptions) => void;
};
