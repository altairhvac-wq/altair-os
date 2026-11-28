/**
 * What can go wrong talking to QuickBooks, reduced to what the engine acts on.
 *
 * ============================== CLASSIFIED, NOT FORWARDED ==============================
 * QuickBooks error bodies can quote back the data that was sent: a customer's
 * name, an address, an amount. They are never stored, logged or shown. A
 * failure is reduced here to a kind and QuickBooks' error NUMBER (a public
 * code such as "6240"), which is enough for the engine to decide and for
 * Intuit's support desk to look up together with the intuit_tid. The same
 * discipline lib/integrations/credentials.ts holds for tokens.
 *
 * Pure. Safe to import anywhere.
 */

export type QboErrorKind =
  /** 401, or Intuit refused the refresh token: the owner must connect again. */
  | "auth"
  /** 429: too many requests for this company; wait a minute. */
  | "rate_limit"
  /** 5xx or a timeout: QuickBooks is having a bad moment; try later. */
  | "server"
  /** The request never got an answer. */
  | "network"
  /** 400 with a validation or business fault: this record, as it is, will not go. */
  | "rejected"
  /** The SyncToken was out of date: somebody changed the record in QuickBooks. */
  | "stale"
  /** The name is already used (by a customer, vendor or employee). */
  | "duplicate_name"
  /** The record Altair points at is gone or inactive in QuickBooks. */
  | "not_found";

/** QuickBooks fault numbers the engine treats specially. */
export const QBO_ERROR_CODES = {
  duplicateName: "6240",
  staleObject: "5010",
  objectNotFound: "610",
} as const;

export class QboError extends Error {
  readonly kind: QboErrorKind;
  /** QuickBooks' own error number, when it gave one. Never its message. */
  readonly code: string | null;
  readonly intuitTid: string | null;
  /** For rate_limit and server: how long QuickBooks asked us to wait. */
  readonly retryAfterSeconds: number | null;

  constructor(input: {
    kind: QboErrorKind;
    code?: string | null;
    intuitTid?: string | null;
    retryAfterSeconds?: number | null;
  }) {
    // Fixed prose only: the message can end up in a log line.
    super(`QuickBooks request failed (${input.kind}${input.code ? ` ${input.code}` : ""})`);
    this.name = "QboError";
    this.kind = input.kind;
    this.code = input.code ?? null;
    this.intuitTid = input.intuitTid ?? null;
    this.retryAfterSeconds = input.retryAfterSeconds ?? null;
  }
}

export function isQboError(value: unknown): value is QboError {
  return value instanceof QboError;
}

/**
 * Turn an HTTP status and a parsed Fault body into a QboError.
 * Only the numeric codes are read from the body.
 */
export function classifyQboFailure(input: {
  status: number;
  body: unknown;
  intuitTid: string | null;
  retryAfterHeader?: string | null;
}): QboError {
  const codes = readFaultCodes(input.body);
  const first = codes[0] ?? null;
  const retryAfter = parseRetryAfter(input.retryAfterHeader ?? null);

  if (input.status === 401 || input.status === 403) {
    return new QboError({ kind: "auth", code: first, intuitTid: input.intuitTid });
  }
  if (input.status === 429) {
    return new QboError({
      kind: "rate_limit",
      code: first,
      intuitTid: input.intuitTid,
      retryAfterSeconds: retryAfter ?? 60,
    });
  }
  if (input.status >= 500) {
    return new QboError({
      kind: "server",
      code: first,
      intuitTid: input.intuitTid,
      retryAfterSeconds: retryAfter,
    });
  }
  if (codes.includes(QBO_ERROR_CODES.duplicateName)) {
    return new QboError({ kind: "duplicate_name", code: QBO_ERROR_CODES.duplicateName, intuitTid: input.intuitTid });
  }
  if (codes.includes(QBO_ERROR_CODES.staleObject)) {
    return new QboError({ kind: "stale", code: QBO_ERROR_CODES.staleObject, intuitTid: input.intuitTid });
  }
  if (codes.includes(QBO_ERROR_CODES.objectNotFound)) {
    return new QboError({ kind: "not_found", code: QBO_ERROR_CODES.objectNotFound, intuitTid: input.intuitTid });
  }
  return new QboError({ kind: "rejected", code: first, intuitTid: input.intuitTid });
}

/** Error numbers from `{ Fault: { Error: [{ code: "6240" }] } }`, digits only. */
export function readFaultCodes(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const fault = (body as { Fault?: unknown }).Fault;
  if (!fault || typeof fault !== "object") return [];
  const errors = (fault as { Error?: unknown }).Error;
  if (!Array.isArray(errors)) return [];
  const codes: string[] = [];
  for (const entry of errors) {
    const code = entry && typeof entry === "object" ? (entry as { code?: unknown }).code : null;
    const text = typeof code === "number" ? String(code) : typeof code === "string" ? code : "";
    // Digits only: a code is a public error number, never free text.
    if (/^\d{1,8}$/.test(text)) codes.push(text);
  }
  return codes;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const seconds = Number.parseInt(header, 10);
  return Number.isFinite(seconds) && seconds > 0 && seconds <= 3600 ? seconds : null;
}
