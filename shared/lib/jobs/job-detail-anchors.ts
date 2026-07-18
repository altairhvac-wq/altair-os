export const JOB_DETAIL_SCOPE_ANCHOR = "job-detail-scope";
export const JOB_DETAIL_MATERIALS_ANCHOR = "job-detail-materials";
export const JOB_DETAIL_ATTACHMENTS_ANCHOR = "job-detail-attachments";
export const JOB_DETAIL_BILLING_ANCHOR = "job-detail-billing";
export const JOB_DETAIL_EQUIPMENT_ANCHOR = "job-detail-equipment";
export const JOB_DETAIL_ACTIVITY_ANCHOR = "job-detail-activity";
export const JOB_DETAIL_NEXT_ACTION_ANCHOR = "job-detail-next-action";
export const JOB_DETAIL_DISPATCH_ANCHOR = "job-detail-dispatch";

/** In-page section nav items for North Star Job Detail. */
export const JOB_DETAIL_SECTION_NAV_ITEMS = [
  { id: JOB_DETAIL_SCOPE_ANCHOR, label: "Scope" },
  { id: JOB_DETAIL_EQUIPMENT_ANCHOR, label: "Equipment", optional: "equipment" },
  { id: JOB_DETAIL_MATERIALS_ANCHOR, label: "Materials" },
  { id: JOB_DETAIL_ATTACHMENTS_ANCHOR, label: "Photos" },
  { id: JOB_DETAIL_BILLING_ANCHOR, label: "Billing", optional: "billing" },
  { id: JOB_DETAIL_ACTIVITY_ANCHOR, label: "History" },
] as const;
