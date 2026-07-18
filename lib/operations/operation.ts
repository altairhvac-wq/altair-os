/**
 * Operation contract for the Operations Execution Framework.
 *
 * An Operation is a named unit of work with ambient context.
 * Business logic belongs only in the callback — never in the framework.
 */

import type { LogMeta, OperationContext, OperationContextInput } from "@/lib/operations/types";

/** Stable dotted name for an operation (e.g. "cron.workflow_reminders.evaluate"). */
export type OperationName = string;

/** Async work unit executed by runOperation(). */
export type OperationCallback<T> = (context: OperationContext) => Promise<T>;

/**
 * Input to runOperation().
 *
 * Lifecycle, logging, retry classification, and metrics are handled by the
 * executor. This type carries only identity, ambient context, and the callback.
 */
export type RunOperationInput<T> = {
  /** Stable operation name used in logs, metrics, and OperationResult. */
  operationName: OperationName;
  /** Ambient context; requestId / companyId / userId filled from ALS when omitted. */
  context?: OperationContextInput;
  /** Optional non-sensitive structured metadata attached to start/finish logs. */
  meta?: LogMeta;
  /**
   * When true, rethrow the original error after logging and metrics.
   * When false (default), return OperationResult with success: false.
   */
  throwOnFailure?: boolean;
  /** Domain / integration work. Must not depend on framework internals. */
  callback: OperationCallback<T>;
};
