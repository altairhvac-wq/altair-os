/**
 * Job Detail tab panel model. Section anchors map 1:1 to tab panels so
 * hash links and workflow stage destinations can select a tab.
 */

import {
  JOB_DETAIL_ACTIVITY_ANCHOR,
  JOB_DETAIL_ATTACHMENTS_ANCHOR,
  JOB_DETAIL_BILLING_ANCHOR,
  JOB_DETAIL_EQUIPMENT_ANCHOR,
  JOB_DETAIL_MATERIALS_ANCHOR,
  JOB_DETAIL_SCOPE_ANCHOR,
  JOB_DETAIL_SECTION_NAV_ITEMS,
} from "@/shared/lib/jobs/job-detail-anchors";

export const JOB_DETAIL_SECTION_SELECT_EVENT = "altair:job-detail-section";

export type JobDetailTabId =
  | typeof JOB_DETAIL_SCOPE_ANCHOR
  | typeof JOB_DETAIL_EQUIPMENT_ANCHOR
  | typeof JOB_DETAIL_MATERIALS_ANCHOR
  | typeof JOB_DETAIL_ATTACHMENTS_ANCHOR
  | typeof JOB_DETAIL_BILLING_ANCHOR
  | typeof JOB_DETAIL_ACTIVITY_ANCHOR;

export type JobDetailSectionSelectDetail = {
  sectionId: string;
};

const TAB_IDS = new Set<string>(
  JOB_DETAIL_SECTION_NAV_ITEMS.map((item) => item.id),
);

export function isJobDetailTabId(value: string): value is JobDetailTabId {
  return TAB_IDS.has(value);
}

export function resolveJobDetailTabId(
  sectionId: string | null | undefined,
  options?: { showBilling?: boolean; showEquipment?: boolean },
): JobDetailTabId {
  const showBilling = options?.showBilling ?? true;
  const showEquipment = options?.showEquipment ?? true;

  if (sectionId && isJobDetailTabId(sectionId)) {
    if (sectionId === JOB_DETAIL_BILLING_ANCHOR && !showBilling) {
      return JOB_DETAIL_SCOPE_ANCHOR;
    }
    if (sectionId === JOB_DETAIL_EQUIPMENT_ANCHOR && !showEquipment) {
      return JOB_DETAIL_SCOPE_ANCHOR;
    }
    return sectionId;
  }

  return JOB_DETAIL_SCOPE_ANCHOR;
}

export function readJobDetailTabFromHash(
  options?: { showBilling?: boolean; showEquipment?: boolean },
): JobDetailTabId {
  if (typeof window === "undefined") {
    return JOB_DETAIL_SCOPE_ANCHOR;
  }

  const hash = window.location.hash;
  if (!hash || hash.length <= 1) {
    return JOB_DETAIL_SCOPE_ANCHOR;
  }

  try {
    return resolveJobDetailTabId(decodeURIComponent(hash.slice(1)), options);
  } catch {
    return JOB_DETAIL_SCOPE_ANCHOR;
  }
}

export function dispatchJobDetailSectionSelect(sectionId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<JobDetailSectionSelectDetail>(
      JOB_DETAIL_SECTION_SELECT_EVENT,
      { detail: { sectionId } },
    ),
  );
}
