export type BillingDocumentStyle = "default" | "invoice" | "estimate";

export function isPremiumBillingDocumentStyle(
  documentStyle: BillingDocumentStyle,
): boolean {
  return documentStyle === "invoice" || documentStyle === "estimate";
}
