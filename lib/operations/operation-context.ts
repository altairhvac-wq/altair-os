import "server-only";

import { logger } from "@/lib/operations/logger";
import {
  createRequestId,
  getRequestContext,
  runWithRequestContext,
} from "@/lib/operations/request-context";
import type {
  LogMeta,
  OperationContext,
  OperationContextInput,
  OperationFinishOptions,
  TimedOperation,
} from "@/lib/operations/types";

/**
 * Creates a reusable operation context object.
 * Fills requestId / startedAt from ALS when available; otherwise generates them.
 */
export function createOperationContext(
  input: OperationContextInput = {},
): OperationContext {
  const fromAls = getRequestContext();

  return {
    requestId: input.requestId ?? fromAls?.requestId ?? createRequestId(),
    companyId: input.companyId ?? fromAls?.companyId,
    userId: input.userId ?? fromAls?.userId,
    route: input.route ?? fromAls?.route,
    operation: input.operation ?? fromAls?.operation,
    startedAt: input.startedAt ?? fromAls?.startedAt ?? Date.now(),
  };
}

/** Returns elapsed milliseconds since context.startedAt. */
export function getOperationDurationMs(context: OperationContext): number {
  return Math.max(0, Date.now() - context.startedAt);
}

/**
 * Starts a timed operation. Call finish() when done to emit a structured duration log.
 *
 * @example
 * const op = startOperation({ operation: "billing.webhook.process", requestId });
 * try {
 *   // ... work
 *   op.finish({ message: "Billing webhook processed" });
 * } catch (error) {
 *   op.finish({ level: "error", message: "Billing webhook failed", error });
 *   throw error;
 * }
 */
export function startOperation(
  input: OperationContextInput = {},
): TimedOperation {
  const context = createOperationContext({
    ...input,
    startedAt: input.startedAt ?? Date.now(),
  });

  return {
    context,
    finish(options: OperationFinishOptions = {}): void {
      const durationMs = getOperationDurationMs(context);
      const level = options.level ?? (options.error ? "error" : "info");
      const message =
        options.message ??
        (options.error ? "Operation failed" : "Operation completed");

      const fields = {
        context,
        requestId: context.requestId,
        companyId: context.companyId,
        userId: context.userId,
        route: context.route,
        operation: context.operation,
        durationMs,
        meta: options.meta,
        error: options.error,
      };

      switch (level) {
        case "debug":
          logger.debug(message, fields);
          break;
        case "warn":
          logger.warn(message, fields);
          break;
        case "error":
          logger.error(message, fields);
          break;
        default:
          logger.info(message, fields);
      }
    },
  };
}

/**
 * Runs an async function inside request ALS + timed operation logging.
 * Future webhooks / cron / server actions can adopt this without changing business logic.
 */
export async function withOperation<T>(
  input: OperationContextInput & { meta?: LogMeta },
  fn: (context: OperationContext) => Promise<T>,
): Promise<T> {
  const context = createOperationContext({
    ...input,
    startedAt: input.startedAt ?? Date.now(),
  });

  return runWithRequestContext(context, async () => {
    const timed = startOperation(context);
    try {
      const result = await fn(timed.context);
      timed.finish({
        message: "Operation completed",
        meta: input.meta,
      });
      return result;
    } catch (error) {
      timed.finish({
        level: "error",
        message: "Operation failed",
        meta: input.meta,
        error,
      });
      throw error;
    }
  });
}

/**
 * Sync variant of withOperation for non-async boundaries.
 */
export function withOperationSync<T>(
  input: OperationContextInput & { meta?: LogMeta },
  fn: (context: OperationContext) => T,
): T {
  const context = createOperationContext({
    ...input,
    startedAt: input.startedAt ?? Date.now(),
  });

  return runWithRequestContext(context, () => {
    const timed = startOperation(context);
    try {
      const result = fn(timed.context);
      timed.finish({
        message: "Operation completed",
        meta: input.meta,
      });
      return result;
    } catch (error) {
      timed.finish({
        level: "error",
        message: "Operation failed",
        meta: input.meta,
        error,
      });
      throw error;
    }
  });
}
