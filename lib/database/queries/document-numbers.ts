import "server-only";

import { resolveDbClient, type DbClient } from "@/lib/database/db-client";

/**
 * Standalone document-number allocation.
 *
 * ==================== WHAT THIS REPLACES ====================
 * Job, invoice, estimate and expense numbers used to be a fixed base plus
 * COUNT(*) of the company's rows. Every one of those columns has a
 * UNIQUE (company_id, <number>) constraint, so the scheme broke in two ways:
 * permanently deleting any row that was not the highest numbered one made the
 * next generated number collide with a row that still existed — and because
 * the formula is deterministic, it collided again on every retry, so document
 * creation stayed broken. Two simultaneous creates hit the same problem
 * without any delete involved.
 *
 * Numbers now come from `allocate_company_document_number` (migration 148),
 * a per-company monotonic counter advanced by a single
 * INSERT ... ON CONFLICT DO UPDATE ... RETURNING. Concurrent callers serialize
 * on the counter row and each receives a distinct value; deletes cannot move
 * it backwards.
 *
 * ==================== WHAT THIS DOES NOT COVER ====================
 * Job-linked CHILD numbers — `EST-1049-01`, `INV-1049-02` — are not allocated
 * here. They are scoped to one job packet and derived from the highest
 * existing sibling, which is a different (and not count-based) rule. Their
 * create paths keep a retry loop because their race is genuine and a retry
 * genuinely resolves it: the second attempt re-reads a max that has moved.
 *
 * ==================== GAPS ====================
 * A number is consumed at allocation. If the insert that was going to use it
 * fails, the number is burned and the sequence moves on, exactly like a
 * Postgres sequence. Gaps in invoice numbers are cosmetic; duplicates are a
 * data-integrity failure.
 */

export type DocumentNumberType = "job" | "estimate" | "invoice" | "expense";

/** Prefix each type's formatted number carries. */
const DOCUMENT_NUMBER_PREFIX: Record<DocumentNumberType, string> = {
  job: "JOB",
  estimate: "EST",
  invoice: "INV",
  expense: "EXP",
};

export class DocumentNumberAllocationError extends Error {
  readonly documentType: DocumentNumberType;

  constructor(documentType: DocumentNumberType, message: string) {
    super(message);
    this.name = "DocumentNumberAllocationError";
    this.documentType = documentType;
  }
}

/**
 * PostgREST may serialize a bigint as a JSON number or as a string depending
 * on configuration. Accept both and reject anything that is not a positive
 * integer — a silently coerced NaN would produce "JOB-NaN".
 */
function parseAllocatedValue(raw: unknown): number | null {
  const value =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw, 10)
        : Number.NaN;

  if (!Number.isSafeInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

/**
 * Consumes the next number for this company and document type and returns it
 * formatted (`JOB-1049`, `INV-1050`, ...).
 *
 * Throws rather than returning a fallback. The previous generators degraded to
 * `JOB-${Date.now()}` when their count query failed, which quietly produced a
 * permanent, meaningless document number in the customer's records. A create
 * that cannot obtain a real number must fail loudly and be retried by a human.
 */
export async function allocateDocumentNumber(
  companyId: string,
  documentType: DocumentNumberType,
  db?: DbClient,
): Promise<string> {
  const supabase = await resolveDbClient(db);

  const { data, error } = await supabase.rpc(
    "allocate_company_document_number",
    {
      p_company_id: companyId,
      p_document_type: documentType,
    },
  );

  if (error) {
    console.error("[allocateDocumentNumber] rpc failed:", {
      companyId,
      documentType,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new DocumentNumberAllocationError(
      documentType,
      `Could not allocate a ${documentType} number: ${error.message}`,
    );
  }

  const value = parseAllocatedValue(data);

  if (value === null) {
    console.error("[allocateDocumentNumber] rpc returned an unusable value:", {
      companyId,
      documentType,
      typeofData: typeof data,
    });
    throw new DocumentNumberAllocationError(
      documentType,
      `Could not allocate a ${documentType} number.`,
    );
  }

  return `${DOCUMENT_NUMBER_PREFIX[documentType]}-${value}`;
}
