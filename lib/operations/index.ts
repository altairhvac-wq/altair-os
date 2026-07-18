/**
 * Altair operations foundation.
 *
 * Structured logging, request correlation IDs, error taxonomy, and safe
 * serialization. Infrastructure only — no domain/business logic.
 *
 * @see docs/altair/OPERATIONS_FOUNDATION.md
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

export {
  logger,
  type LogFields,
  type Logger,
  type LoggerBindings,
} from "@/lib/operations/logger";

export {
  createOperationContext,
  getOperationDurationMs,
  startOperation,
  withOperation,
  withOperationSync,
} from "@/lib/operations/operation-context";

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
