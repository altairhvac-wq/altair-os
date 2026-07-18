import {
  DEFAULT_SAFE_MESSAGES,
  ERROR_CODES,
} from "@/lib/operations/constants";
import type { ErrorCategory, LogMeta } from "@/lib/operations/types";

export type AltairErrorOptions = {
  /** User-safe message. Defaults per error class when omitted. */
  safeMessage?: string;
  /** Non-sensitive structured details for logs (never Stripe payloads / secrets). */
  details?: LogMeta;
  cause?: unknown;
  /** Override default retryable flag when the caller knows better. */
  retryable?: boolean;
  /** Override default stable code when needed for finer-grained callers. */
  code?: string;
};

/**
 * Base class for Altair's operational error taxonomy.
 * Always expose code, category, retryable, and a user-safe message.
 */
export abstract class AltairError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;
  abstract readonly retryable: boolean;

  readonly safeMessage: string;
  readonly details?: LogMeta;
  override readonly cause?: unknown;

  protected constructor(
    defaultSafeMessage: string,
    options: AltairErrorOptions = {},
  ) {
    const safeMessage = options.safeMessage ?? defaultSafeMessage;
    super(safeMessage, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.safeMessage = safeMessage;
    this.details = options.details;
    this.cause = options.cause;

    // Ensure instanceof works across bundler boundaries when possible.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AltairError {
  readonly code: string;
  readonly category = "validation" as const;
  readonly retryable: boolean;

  constructor(options: AltairErrorOptions = {}) {
    super(DEFAULT_SAFE_MESSAGES.VALIDATION, options);
    this.code = options.code ?? ERROR_CODES.VALIDATION;
    this.retryable = options.retryable ?? false;
  }
}

export class AuthorizationError extends AltairError {
  readonly code: string;
  readonly category = "authorization" as const;
  readonly retryable: boolean;

  constructor(options: AltairErrorOptions = {}) {
    super(DEFAULT_SAFE_MESSAGES.AUTHORIZATION, options);
    this.code = options.code ?? ERROR_CODES.AUTHORIZATION;
    this.retryable = options.retryable ?? false;
  }
}

export class NotFoundError extends AltairError {
  readonly code: string;
  readonly category = "not_found" as const;
  readonly retryable: boolean;

  constructor(options: AltairErrorOptions = {}) {
    super(DEFAULT_SAFE_MESSAGES.NOT_FOUND, options);
    this.code = options.code ?? ERROR_CODES.NOT_FOUND;
    this.retryable = options.retryable ?? false;
  }
}

export class ConflictError extends AltairError {
  readonly code: string;
  readonly category = "conflict" as const;
  readonly retryable: boolean;

  constructor(options: AltairErrorOptions = {}) {
    super(DEFAULT_SAFE_MESSAGES.CONFLICT, options);
    this.code = options.code ?? ERROR_CODES.CONFLICT;
    this.retryable = options.retryable ?? false;
  }
}

export class ExternalServiceError extends AltairError {
  readonly code: string;
  readonly category = "external_service" as const;
  readonly retryable: boolean;

  constructor(options: AltairErrorOptions = {}) {
    super(DEFAULT_SAFE_MESSAGES.EXTERNAL_SERVICE, options);
    this.code = options.code ?? ERROR_CODES.EXTERNAL_SERVICE;
    this.retryable = options.retryable ?? true;
  }
}

export class InfrastructureError extends AltairError {
  readonly code: string;
  readonly category = "infrastructure" as const;
  readonly retryable: boolean;

  constructor(options: AltairErrorOptions = {}) {
    super(DEFAULT_SAFE_MESSAGES.INFRASTRUCTURE, options);
    this.code = options.code ?? ERROR_CODES.INFRASTRUCTURE;
    this.retryable = options.retryable ?? true;
  }
}

export class UnexpectedError extends AltairError {
  readonly code: string;
  readonly category = "unexpected" as const;
  readonly retryable: boolean;

  constructor(options: AltairErrorOptions = {}) {
    super(DEFAULT_SAFE_MESSAGES.UNEXPECTED, options);
    this.code = options.code ?? ERROR_CODES.UNEXPECTED;
    this.retryable = options.retryable ?? false;
  }
}

/** Type guard for the Altair error taxonomy. */
export function isAltairError(error: unknown): error is AltairError {
  return error instanceof AltairError;
}
