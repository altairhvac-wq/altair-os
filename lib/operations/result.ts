/**
 * Standardized result model for the Operations Execution Framework.
 * Infrastructure only — never embeds domain payloads beyond the generic value.
 */

import type { SerializedError } from "@/lib/operations/types";

/**
 * Outcome of runOperation().
 *
 * Always safe to return across boundaries: `error` is client-safe serialization
 * only (no stacks, secrets, or internal messages from unknown failures).
 */
export type OperationResult<T = void> = {
  success: boolean;
  durationMs: number;
  /** Classification only — this framework does not retry. */
  retryable: boolean;
  operation: string;
  requestId: string;
  value?: T;
  error?: SerializedError;
};

/** Successful operation result helper. */
export function operationSuccess<T>(input: {
  operation: string;
  requestId: string;
  durationMs: number;
  value: T;
}): OperationResult<T> {
  return {
    success: true,
    durationMs: input.durationMs,
    retryable: false,
    operation: input.operation,
    requestId: input.requestId,
    value: input.value,
  };
}

/** Failed operation result helper. */
export function operationFailure(input: {
  operation: string;
  requestId: string;
  durationMs: number;
  retryable: boolean;
  error: SerializedError;
}): OperationResult<never> {
  return {
    success: false,
    durationMs: input.durationMs,
    retryable: input.retryable,
    operation: input.operation,
    requestId: input.requestId,
    error: input.error,
  };
}
