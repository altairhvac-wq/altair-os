/**
 * Retry classification for the Operations Execution Framework.
 *
 * This module classifies only. It does NOT retry, schedule, or enqueue work.
 * Future queues / workers may consume `retryable` from OperationResult.
 */

import { isAltairError } from "@/lib/operations/errors";
import type { ErrorCategory } from "@/lib/operations/types";

/**
 * Default retryability by error category.
 *
 * | Category          | Retryable |
 * |-------------------|-----------|
 * | validation        | never     |
 * | authorization     | never     |
 * | not_found         | never     |
 * | conflict          | never     |
 * | unexpected        | never     |
 * | external_service  | yes       |
 * | infrastructure    | yes       |
 */
const CATEGORY_RETRYABLE: Record<ErrorCategory, boolean> = {
  validation: false,
  authorization: false,
  not_found: false,
  conflict: false,
  unexpected: false,
  external_service: true,
  infrastructure: true,
};

/**
 * Returns whether a failure is classified as retryable.
 * Prefers AltairError.retryable; falls back to category defaults; unknown → false.
 */
export function classifyRetryable(error: unknown): boolean {
  if (isAltairError(error)) {
    return error.retryable;
  }

  return false;
}

/**
 * Returns the default retryable flag for a taxonomy category.
 * Useful when mapping non-Altair errors at a boundary before wrapping.
 */
export function isCategoryRetryable(category: ErrorCategory): boolean {
  return CATEGORY_RETRYABLE[category];
}
