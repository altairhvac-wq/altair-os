"use client";

import { useMemo, useState, type MouseEvent } from "react";
import {
  JOB_DETAIL_ACTIVITY_ANCHOR,
  JOB_DETAIL_ATTACHMENTS_ANCHOR,
  JOB_DETAIL_BILLING_ANCHOR,
  JOB_DETAIL_EQUIPMENT_ANCHOR,
  JOB_DETAIL_MATERIALS_ANCHOR,
  JOB_DETAIL_SCOPE_ANCHOR,
} from "@/shared/lib/jobs/job-detail-anchors";
import { scrollToJobDetailSection } from "@/shared/lib/jobs/job-detail-scroll";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import { useJobDetailActiveSection } from "@/shared/components/jobs/useJobDetailActiveSection";

type JobDetailSectionNavProps = {
  showBilling: boolean;
  showEquipment: boolean;
};

type NavItem = {
  id: string;
  label: string;
};

const BASE_ITEMS: NavItem[] = [
  { id: JOB_DETAIL_SCOPE_ANCHOR, label: "Scope" },
  { id: JOB_DETAIL_EQUIPMENT_ANCHOR, label: "Equipment" },
  { id: JOB_DETAIL_MATERIALS_ANCHOR, label: "Materials" },
  { id: JOB_DETAIL_ATTACHMENTS_ANCHOR, label: "Photos" },
  { id: JOB_DETAIL_BILLING_ANCHOR, label: "Billing" },
  { id: JOB_DETAIL_ACTIVITY_ANCHOR, label: "History" },
];

export function JobDetailSectionNav({
  showBilling,
  showEquipment,
}: JobDetailSectionNavProps) {
  const items = useMemo(
    () =>
      BASE_ITEMS.filter((item) => {
        if (item.id === JOB_DETAIL_EQUIPMENT_ANCHOR) {
          return showEquipment;
        }
        if (item.id === JOB_DETAIL_BILLING_ANCHOR) {
          return showBilling;
        }
        return true;
      }),
    [showBilling, showEquipment],
  );

  const sectionIds = useMemo(() => items.map((item) => item.id), [items]);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const activeId = useJobDetailActiveSection(sectionIds, clickedId);

  function handleNavClick(
    event: MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) {
    event.preventDefault();
    setClickedId(sectionId);
    scrollToJobDetailSection(sectionId, { updateHash: true, focus: true });
    window.setTimeout(() => setClickedId(null), 800);
  }

  return (
    <nav aria-label="Job sections" className={dt.sectionNav}>
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(event) => handleNavClick(event, item.id)}
            aria-current={isActive ? "location" : undefined}
            className={`${dt.sectionNavLink} ${
              isActive
                ? "bg-[rgba(201,164,77,0.16)] text-[#17130E] shadow-[inset_0_-2px_0_0_#B88A2E]"
                : ""
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
