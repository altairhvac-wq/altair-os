import Link from "next/link";
import {
  JOB_DETAIL_ACTIVITY_ANCHOR,
  JOB_DETAIL_ATTACHMENTS_ANCHOR,
  JOB_DETAIL_BILLING_ANCHOR,
  JOB_DETAIL_EQUIPMENT_ANCHOR,
  JOB_DETAIL_MATERIALS_ANCHOR,
  JOB_DETAIL_SCOPE_ANCHOR,
} from "@/shared/lib/jobs/job-detail-anchors";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type JobDetailSectionNavProps = {
  showBilling: boolean;
  showEquipment: boolean;
};

export function JobDetailSectionNav({
  showBilling,
  showEquipment,
}: JobDetailSectionNavProps) {
  return (
    <nav aria-label="Job sections" className={dt.sectionNav}>
      <Link href={`#${JOB_DETAIL_SCOPE_ANCHOR}`} className={dt.sectionNavLink}>
        Scope
      </Link>
      {showEquipment ? (
        <Link href={`#${JOB_DETAIL_EQUIPMENT_ANCHOR}`} className={dt.sectionNavLink}>
          Equipment
        </Link>
      ) : null}
      <Link href={`#${JOB_DETAIL_MATERIALS_ANCHOR}`} className={dt.sectionNavLink}>
        Materials
      </Link>
      <Link href={`#${JOB_DETAIL_ATTACHMENTS_ANCHOR}`} className={dt.sectionNavLink}>
        Photos
      </Link>
      {showBilling ? (
        <Link href={`#${JOB_DETAIL_BILLING_ANCHOR}`} className={dt.sectionNavLink}>
          Billing
        </Link>
      ) : null}
      <Link href={`#${JOB_DETAIL_ACTIVITY_ANCHOR}`} className={dt.sectionNavLink}>
        Activity
      </Link>
    </nav>
  );
}
