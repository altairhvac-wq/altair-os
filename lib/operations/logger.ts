import "server-only";

import { getRequestContext } from "@/lib/operations/request-context";
import {
  redactMeta,
  serializeErrorForLog,
} from "@/lib/operations/serialize-error";
import type {
  LogLevel,
  LogMeta,
  OperationContext,
} from "@/lib/operations/types";

export type LoggerBindings = {
  requestId?: string;
  companyId?: string;
  userId?: string;
  route?: string;
  operation?: string;
};

export type LogFields = LoggerBindings & {
  meta?: LogMeta;
  error?: unknown;
  durationMs?: number;
  context?: Partial<OperationContext>;
};

type StructuredLogRecord = {
  level: LogLevel;
  message: string;
  ts: string;
  requestId?: string;
  companyId?: string;
  userId?: string;
  route?: string;
  operation?: string;
  durationMs?: number;
  meta?: LogMeta;
  error?: ReturnType<typeof serializeErrorForLog>;
};

function resolveBindings(fields?: LogFields): LoggerBindings {
  const fromAls = getRequestContext();
  const fromContext = fields?.context;

  return {
    requestId:
      fields?.requestId ?? fromContext?.requestId ?? fromAls?.requestId,
    companyId:
      fields?.companyId ?? fromContext?.companyId ?? fromAls?.companyId,
    userId: fields?.userId ?? fromContext?.userId ?? fromAls?.userId,
    route: fields?.route ?? fromContext?.route ?? fromAls?.route,
    operation:
      fields?.operation ?? fromContext?.operation ?? fromAls?.operation,
  };
}

function buildRecord(
  level: LogLevel,
  message: string,
  fields?: LogFields,
): StructuredLogRecord {
  const bindings = resolveBindings(fields);
  const record: StructuredLogRecord = {
    level,
    message,
    ts: new Date().toISOString(),
    ...bindings,
  };

  if (fields?.durationMs !== undefined) {
    record.durationMs = fields.durationMs;
  }

  if (fields?.meta !== undefined) {
    record.meta = redactMeta(fields.meta) as LogMeta;
  }

  if (fields?.error !== undefined) {
    record.error = serializeErrorForLog(fields.error);
  }

  return record;
}

function write(level: LogLevel, message: string, fields?: LogFields): void {
  const record = buildRecord(level, message, fields);
  const line = JSON.stringify(record);

  switch (level) {
    case "debug":
      // eslint-disable-next-line no-console -- operations foundation sink
      console.debug(line);
      break;
    case "info":
      // eslint-disable-next-line no-console -- operations foundation sink
      console.info(line);
      break;
    case "warn":
      // eslint-disable-next-line no-console -- operations foundation sink
      console.warn(line);
      break;
    case "error":
      // eslint-disable-next-line no-console -- operations foundation sink
      console.error(line);
      break;
    default: {
      const _exhaustive: never = level;
      void _exhaustive;
    }
  }
}

/**
 * Structured logger for Altair server boundaries.
 *
 * Always pass structured fields — never concatenate IDs into the message string.
 *
 * @example
 * logger.info("Checkout created", {
 *   companyId,
 *   userId,
 *   requestId,
 *   operation: "saas.checkout.create",
 *   durationMs,
 * });
 */
export const logger = {
  debug(message: string, fields?: LogFields): void {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    write("debug", message, fields);
  },

  info(message: string, fields?: LogFields): void {
    write("info", message, fields);
  },

  warn(message: string, fields?: LogFields): void {
    write("warn", message, fields);
  },

  error(message: string, fields?: LogFields): void {
    write("error", message, fields);
  },

  /**
   * Returns a child logger with pre-bound context fields (requestId, operation, etc.).
   * Explicit fields on each call override the bindings.
   */
  child(bindings: LoggerBindings) {
    const bind = (fields?: LogFields): LogFields => ({
      ...bindings,
      ...fields,
    });

    return {
      debug(message: string, fields?: LogFields): void {
        logger.debug(message, bind(fields));
      },
      info(message: string, fields?: LogFields): void {
        logger.info(message, bind(fields));
      },
      warn(message: string, fields?: LogFields): void {
        logger.warn(message, bind(fields));
      },
      error(message: string, fields?: LogFields): void {
        logger.error(message, bind(fields));
      },
    };
  },
};

export type Logger = typeof logger;
