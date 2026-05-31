/** How an estimate reached approved status (stored in activity metadata). */
export type EstimateApprovalSource =
  | "public_link"
  | "technician_device"
  | "admin_manual";

export const ESTIMATE_APPROVAL_SOURCE_LABELS: Record<
  EstimateApprovalSource,
  string
> = {
  public_link: "Customer approval link",
  technician_device: "Technician device (on site)",
  admin_manual: "Office manual approval",
};
