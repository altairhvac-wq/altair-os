export type BillingDocumentStyle = "default" | "invoice" | "estimate";

/** Customer-facing public pages use a compact one-screen mobile layout. */
export type BillingDocumentLayoutVariant = "default" | "public";

export function isPremiumBillingDocumentStyle(
  documentStyle: BillingDocumentStyle,
): boolean {
  return documentStyle === "invoice" || documentStyle === "estimate";
}
