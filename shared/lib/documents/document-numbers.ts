export type DocumentKind = "job" | "estimate" | "invoice";

export type ParsedDocumentReference = {
  kind: DocumentKind | "unknown";
  /** Canonical-ish display form when recognizable, e.g. JOB-1001 or EST-1001-01. */
  canonical: string | null;
  /** Shared job packet core after the JOB-/EST-/INV- prefix, e.g. 1001 or DEMO-1001. */
  jobCore: string | null;
  /** Child sequence for estimates/invoices, e.g. 01. */
  sequence: string | null;
  /** Compact alphanumeric form used for normalized matching. */
  compact: string;
};

const PREFIX_BY_KIND: Record<DocumentKind, string> = {
  job: "JOB",
  estimate: "EST",
  invoice: "INV",
};

/** Display helper — stored numbers are already canonical; normalize whitespace only. */
export function formatJobNumber(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function formatEstimateNumber(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function formatInvoiceNumber(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Strip a leading JOB- prefix to get the shared packet core (1001 or DEMO-1001). */
export function extractJobReferenceCore(
  jobNumber: string | null | undefined,
): string | null {
  const trimmed = (jobNumber ?? "").trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^JOB-(.+)$/i);
  const core = match?.[1]?.trim();
  return core || null;
}

export function buildJobLinkedEstimateNumber(
  jobNumber: string,
  sequence: number,
): string | null {
  const core = extractJobReferenceCore(jobNumber);
  if (!core || !Number.isFinite(sequence) || sequence < 1) return null;
  return `EST-${core}-${String(Math.floor(sequence)).padStart(2, "0")}`;
}

export function buildJobLinkedInvoiceNumber(
  jobNumber: string,
  sequence: number,
): string | null {
  const core = extractJobReferenceCore(jobNumber);
  if (!core || !Number.isFinite(sequence) || sequence < 1) return null;
  return `INV-${core}-${String(Math.floor(sequence)).padStart(2, "0")}`;
}

export function parseChildDocumentSequence(
  documentNumber: string,
  kind: "estimate" | "invoice",
  jobCore: string,
): number | null {
  const prefix = kind === "estimate" ? "EST" : "INV";
  const escapedCore = jobCore.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^${prefix}-${escapedCore}-(\\d+)$`,
    "i",
  );
  const match = documentNumber.trim().match(pattern);
  if (!match) return null;
  const sequence = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(sequence) && sequence > 0 ? sequence : null;
}

/**
 * Recognize common document-number variants without forcing every numeric
 * string into a single document type.
 */
export function parseDocumentReference(
  raw: string,
  preferredKind?: DocumentKind,
): ParsedDocumentReference {
  const trimmed = raw.trim();
  const compact = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (!compact) {
    return {
      kind: "unknown",
      canonical: null,
      jobCore: null,
      sequence: null,
      compact: "",
    };
  }

  const prefixed = compact.match(/^(job|est|inv)(.+)$/);
  if (prefixed) {
    const kindToken = prefixed[1];
    const rest = prefixed[2] ?? "";
    const kind: DocumentKind =
      kindToken === "job"
        ? "job"
        : kindToken === "est"
          ? "estimate"
          : "invoice";

    if (kind === "job") {
      return {
        kind,
        canonical: rest ? `JOB-${rest.toUpperCase()}` : null,
        jobCore: rest ? rest.toUpperCase() : null,
        sequence: null,
        compact,
      };
    }

    const sequenceMatch = rest.match(/^(.+?)(\d{2})$/);
    if (sequenceMatch && rest.length > 2) {
      const core = sequenceMatch[1]?.toUpperCase() ?? "";
      const sequence = sequenceMatch[2] ?? null;
      const prefix = PREFIX_BY_KIND[kind];
      return {
        kind,
        canonical: core && sequence ? `${prefix}-${core}-${sequence}` : null,
        jobCore: core || null,
        sequence,
        compact,
      };
    }

    return {
      kind,
      canonical: rest ? `${PREFIX_BY_KIND[kind]}-${rest.toUpperCase()}` : null,
      jobCore: rest ? rest.toUpperCase() : null,
      sequence: null,
      compact,
    };
  }

  if (preferredKind === "job" && /^[a-z0-9]+$/i.test(compact)) {
    return {
      kind: "job",
      canonical: `JOB-${compact.toUpperCase()}`,
      jobCore: compact.toUpperCase(),
      sequence: null,
      compact,
    };
  }

  return {
    kind: "unknown",
    canonical: null,
    jobCore: null,
    sequence: null,
    compact,
  };
}
