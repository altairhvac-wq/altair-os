export type BillingDocumentStyle = "default" | "invoice" | "estimate";

/** Customer-facing public pages use a compact one-screen mobile layout. */
export type BillingDocumentLayoutVariant = "default" | "public";

/** Who is viewing the estimate document (print is handled via CSS). */
export type BillingDocumentAudience = "admin" | "customer";

export function isPremiumBillingDocumentStyle(
  documentStyle: BillingDocumentStyle,
): boolean {
  return documentStyle === "invoice" || documentStyle === "estimate";
}

/** Letter-like page presence on screen; overridden to natural height in print CSS. */
export const estimateDocumentPagePresenceClass =
  "min-h-[960px] print:min-h-0";

/** Compact footer after document content; blank page space comes from min-height only. */
export const estimateDocumentFooterAnchorClass =
  "estimate-document-footer-anchor print:mt-0";

/** Wet signature lines — screen hidden, print visible. */
export const estimatePrintSignatureClass = "estimate-print-signature";

/** Blocks that must never appear on screen (signature lines, print footer). */
export const estimatePrintOnlyBlockClass = "estimate-print-only-block";
