import Link from "next/link";
import {
  CUSTOMER_DETAIL_360_ANCHOR,
  CUSTOMER_DETAIL_ACTIVITY_ANCHOR,
  CUSTOMER_DETAIL_BILLING_ANCHOR,
  CUSTOMER_DETAIL_EQUIPMENT_ANCHOR,
  CUSTOMER_DETAIL_JOBS_ANCHOR,
} from "@/shared/lib/customers/customer-detail-anchors";

type CustomerDetailSectionNavProps = {
  showCustomer360: boolean;
  showBilling: boolean;
};

const navLinkClass =
  "inline-flex min-h-9 shrink-0 items-center rounded-lg px-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900";

export function CustomerDetailSectionNav({
  showCustomer360,
  showBilling,
}: CustomerDetailSectionNavProps) {
  return (
    <nav
      aria-label="Customer sections"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
    >
      {showCustomer360 ? (
        <Link href={`#${CUSTOMER_DETAIL_360_ANCHOR}`} className={navLinkClass}>
          360
        </Link>
      ) : null}
      <Link href={`#${CUSTOMER_DETAIL_JOBS_ANCHOR}`} className={navLinkClass}>
        Jobs
      </Link>
      <Link href={`#${CUSTOMER_DETAIL_EQUIPMENT_ANCHOR}`} className={navLinkClass}>
        Equipment
      </Link>
      {showBilling ? (
        <Link href={`#${CUSTOMER_DETAIL_BILLING_ANCHOR}`} className={navLinkClass}>
          Billing
        </Link>
      ) : null}
      <Link href={`#${CUSTOMER_DETAIL_ACTIVITY_ANCHOR}`} className={navLinkClass}>
        Activity
      </Link>
    </nav>
  );
}
