/**
 * Operations Execution Framework — unified runOperation() entrypoint.
 *
 * Standardizes lifecycle, logging, context, timing, retry classification,
 * error handling, and metrics hooks. Does not queue, retry, or schedule work.
 */

import "server-only";

import { logger } from "@/lib/operations/logger";
import {
  onOperationFailed,
  onOperationFinished,
  onOperationStarted,
} from "@/lib/operations/metrics";
import { createOperationContext } from "@/lib/operations/operation-context";
import type { RunOperationInput } from "@/lib/operations/operation";
import {
  operationFailure,
  operationSuccess,
  type OperationResult,
} from "@/lib/operations/result";
import { runWithRequestContext } from "@/lib/operations/request-context";
import { classifyRetryable } from "@/lib/operations/retry";
import { serializeError } from "@/lib/operations/serialize-error";

/**
 * Executes a named operation with standardized observability.
 *
 * Lifecycle:
 *   Operation → Context → Logger → Execution → Result → Metrics → Return
 *
 * - Classifies retryability; does not retry.
 * - Never exposes internal errors on OperationResult.error (uses serializeError).
 * - Throws only when throwOnFailure is true (after logging / metrics).
 */
export async function runOperation<T>(
  input: RunOperationInput<T>,
): Promise<OperationResult<T>> {
  const context = createOperationContext({
    ...input.context,
    operation: input.operationName,
    startedAt: input.context?.startedAt ?? Date.now(),
  });

  return runWithRequestContext(context, async () => {
    const metricsBase = {
      operation: input.operationName,
      requestId: context.requestId,
      companyId: context.companyId,
      userId: context.userId,
      route: context.route,
    };

    onOperationStarted(metricsBase);

    logger.info("Operation started", {
      context,
      requestId: context.requestId,
      companyId: context.companyId,
      userId: context.userId,
      route: context.route,
      operation: input.operationName,
      meta: input.meta,
    });

    const startedAt = context.startedAt;

    try {
      const value = await input.callback(context);
      const durationMs = Math.max(0, Date.now() - startedAt);

      logger.info("Operation completed", {
        context,
        requestId: context.requestId,
        companyId: context.companyId,
        userId: context.userId,
        route: context.route,
        operation: input.operationName,
        durationMs,
        meta: input.meta,
      });

      onOperationFinished({
        ...metricsBase,
        durationMs,
        success: true,
        retryable: false,
      });

      return operationSuccess({
        operation: input.operationName,
        requestId: context.requestId,
        durationMs,
        value,
      });
    } catch (error) {
      const durationMs = Math.max(0, Date.now() - startedAt);
      const retryable = classifyRetryable(error);
      const serialized = serializeError(error);

      logger.error("Operation failed", {
        context,
        requestId: context.requestId,
        companyId: context.companyId,
        userId: context.userId,
        route: context.route,
        operation: input.operationName,
        durationMs,
        meta: {
          ...input.meta,
          retryable,
        },
        error,
      });

      const finishEvent = {
        ...metricsBase,
        durationMs,
        success: false,
        retryable,
      };

      onOperationFailed(finishEvent);
      onOperationFinished(finishEvent);

      if (input.throwOnFailure) {
        throw error;
      }

      return operationFailure({
        operation: input.operationName,
        requestId: context.requestId,
        durationMs,
        retryable,
        error: serialized,
      }) as OperationResult<T>;
    }
  });
}
