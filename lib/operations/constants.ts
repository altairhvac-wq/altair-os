/**
 * Constants for the Altair operations foundation.
 */

/** Canonical HTTP / propagation header for request correlation IDs. */
export const REQUEST_ID_HEADER = "x-request-id";

/** Alternate header accepted when reading inbound correlation IDs. */
export const REQUEST_ID_HEADER_ALT = "x-correlation-id";

/** Stable error codes for the operations error taxonomy. */
export const ERROR_CODES = {
  VALIDATION: "VALIDATION_ERROR",
  AUTHORIZATION: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  EXTERNAL_SERVICE: "EXTERNAL_SERVICE_ERROR",
  INFRASTRUCTURE: "INFRASTRUCTURE_ERROR",
  UNEXPECTED: "UNEXPECTED_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Default user-safe messages when none is provided. */
export const DEFAULT_SAFE_MESSAGES = {
  VALIDATION: "The request could not be validated.",
  AUTHORIZATION: "You are not authorized to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  CONFLICT: "The request conflicts with the current state.",
  EXTERNAL_SERVICE: "An external service failed. Please try again later.",
  INFRASTRUCTURE: "A system error occurred. Please try again later.",
  UNEXPECTED: "An unexpected error occurred.",
} as const;

/**
 * Metadata / object keys that must never appear in logs or serialized output.
 * Matching is case-insensitive and also checks snake_case / camelCase variants
 * via substring rules in serialize-error / logger redaction.
 */
export const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /cookie/i,
  /set-cookie/i,
  /jwt/i,
  /private[_-]?key/i,
  /service[_-]?role/i,
  /webhook[_-]?secret/i,
  /stripe[_-]?(secret|key|payload|body)/i,
  /card[_-]?(number|cvc|cvv|pan)/i,
  /account[_-]?number/i,
  /routing[_-]?number/i,
  /ssn/i,
  /social[_-]?security/i,
  /raw[_-]?body/i,
  /signature/i,
];

/** Maximum depth when redacting nested metadata objects. */
export const MAX_REDACTION_DEPTH = 6;

/** Placeholder written in place of redacted values. */
export const REDACTED_VALUE = "[REDACTED]";
