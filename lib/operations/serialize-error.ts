import {
  DEFAULT_SAFE_MESSAGES,
  ERROR_CODES,
  MAX_REDACTION_DEPTH,
  REDACTED_VALUE,
  SENSITIVE_KEY_PATTERNS,
} from "@/lib/operations/constants";
import { AltairError } from "@/lib/operations/errors";
import type {
  LogMeta,
  SerializedError,
  SerializedErrorForLog,
} from "@/lib/operations/types";

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Deep-redacts sensitive keys from structured metadata.
 * Used by serializers and the logger — never log Stripe payloads or secrets.
 */
export function redactMeta(value: unknown, depth = 0): unknown {
  if (value == null) {
    return value;
  }

  if (depth >= MAX_REDACTION_DEPTH) {
    return "[MaxDepth]";
  }

  if (typeof value === "string") {
    // Never echo JWT-shaped or obviously credential-bearing strings at length.
    if (value.length > 32 && value.split(".").length === 3) {
      return REDACTED_VALUE;
    }
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactMeta(item, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      result[key] = REDACTED_VALUE;
      continue;
    }
    result[key] = redactMeta(nested, depth + 1);
  }
  return result;
}

/**
 * Client-safe error serialization.
 *
 * Never exposes secrets, tokens, SQL, stack traces, or raw internal messages
 * from unknown errors. AltairError.safeMessage is the only message surface.
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof AltairError) {
    return {
      code: error.code,
      category: error.category,
      message: error.safeMessage,
      retryable: error.retryable,
    };
  }

  return {
    code: ERROR_CODES.UNEXPECTED,
    category: "unexpected",
    message: DEFAULT_SAFE_MESSAGES.UNEXPECTED,
    retryable: false,
  };
}

export type SerializeErrorForLogOptions = {
  /**
   * Include stack traces. Defaults to true only when NODE_ENV === "development".
   * Production logs must keep stacks off by default.
   */
  includeStack?: boolean;
};

function shouldIncludeStack(options?: SerializeErrorForLogOptions): boolean {
  if (options?.includeStack !== undefined) {
    return options.includeStack;
  }
  return process.env.NODE_ENV === "development";
}

/**
 * Log-oriented error serialization.
 * Preserves taxonomy fields and optional development-only stacks.
 * Still redacts sensitive details keys.
 */
export function serializeErrorForLog(
  error: unknown,
  options?: SerializeErrorForLogOptions,
): SerializedErrorForLog {
  const includeStack = shouldIncludeStack(options);

  if (error instanceof AltairError) {
    const serialized: SerializedErrorForLog = {
      name: error.name,
      code: error.code,
      category: error.category,
      message: error.safeMessage,
      retryable: error.retryable,
    };

    if (includeStack && error.stack) {
      serialized.stack = error.stack;
    }

    if (error.details) {
      serialized.details = redactMeta(error.details) as LogMeta;
    }

    if (error.cause !== undefined) {
      serialized.cause = serializeErrorForLog(error.cause, options);
    }

    return serialized;
  }

  if (error instanceof Error) {
    const serialized: SerializedErrorForLog = {
      name: error.name || "Error",
      code: ERROR_CODES.UNEXPECTED,
      category: "unexpected",
      // Internal log message only — never return this via serializeError().
      message: error.message || DEFAULT_SAFE_MESSAGES.UNEXPECTED,
      retryable: false,
    };

    if (includeStack && error.stack) {
      serialized.stack = error.stack;
    }

    if (error.cause !== undefined) {
      serialized.cause = serializeErrorForLog(error.cause, options);
    }

    return serialized;
  }

  return {
    name: "UnknownError",
    code: ERROR_CODES.UNEXPECTED,
    category: "unexpected",
    message: DEFAULT_SAFE_MESSAGES.UNEXPECTED,
    retryable: false,
  };
}
