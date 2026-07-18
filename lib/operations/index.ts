/**
 * Altair operations foundation + execution framework.
 *
 * Structured logging, request correlation IDs, error taxonomy, safe
 * serialization, and a reusable operation executor. Infrastructure only —
 * no domain/business logic.
 *
 * @see docs/altair/OPERATIONS_FOUNDATION.md
 * @see docs/altair/OPERATIONS_EXECUTION_FRAMEWORK.md
 */

export {
  DEFAULT_SAFE_MESSAGES,
  ERROR_CODES,
  MAX_REDACTION_DEPTH,
  REDACTED_VALUE,
  REQUEST_ID_HEADER,
  REQUEST_ID_HEADER_ALT,
  SENSITIVE_KEY_PATTERNS,
  type ErrorCode,
} from "@/lib/operations/constants";

export {
  AltairError,
  AuthorizationError,
  ConflictError,
  ExternalServiceError,
  InfrastructureError,
  isAltairError,
  NotFoundError,
  UnexpectedError,
  ValidationError,
  type AltairErrorOptions,
} from "@/lib/operations/errors";

export { runOperation } from "@/lib/operations/executor";

export {
  logger,
  type LogFields,
  type Logger,
  type LoggerBindings,
} from "@/lib/operations/logger";

export {
  getOperationMetricsHooks,
  onOperationFailed,
  onOperationFinished,
  onOperationStarted,
  resetOperationMetricsHooks,
  setOperationMetricsHooks,
  type OperationMetricsFinishEvent,
  type OperationMetricsHooks,
  type OperationMetricsStartEvent,
} from "@/lib/operations/metrics";

export {
  createOperationContext,
  getOperationDurationMs,
  startOperation,
  withOperation,
  withOperationSync,
} from "@/lib/operations/operation-context";

export type {
  OperationCallback,
  OperationName,
  RunOperationInput,
} from "@/lib/operations/operation";

export {
  createRequestId,
  getOrCreateRequestId,
  getRequestContext,
  getRequestId,
  operationContextFromRequest,
  requestIdFromHeaders,
  resolveRequestId,
  runWithRequestContext,
  updateRequestContext,
} from "@/lib/operations/request-context";

export {
  operationFailure,
  operationSuccess,
  type OperationResult,
} from "@/lib/operations/result";

export {
  classifyRetryable,
  isCategoryRetryable,
} from "@/lib/operations/retry";

export {
  redactMeta,
  serializeError,
  serializeErrorForLog,
  type SerializeErrorForLogOptions,
} from "@/lib/operations/serialize-error";

export type {
  ErrorCategory,
  LogLevel,
  LogMeta,
  OperationContext,
  OperationContextInput,
  OperationFinishOptions,
  SerializedError,
  SerializedErrorForLog,
  TimedOperation,
} from "@/lib/operations/types";
