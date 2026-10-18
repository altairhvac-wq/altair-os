import Link from "next/link";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { formatDateInTimeZone } from "@/shared/lib/datetime";

type BillingGraceBannerProps = {
  access: CompanyBillingAccess;
  /** Company timezone, so the server and the client print the same date. */
  timeZone: string;
  className?: string;
};

const BILLING_SETTINGS_HREF = "/settings/subscription";

/**
 * Dashboard notice for a company whose SaaS payment failed and which is
 * working inside its grace window.
 *
 * The top-bar pill already says "Payment past due"; it is 17 px tall and easy
 * to miss on the one day it matters. This is the loud version: it renders once,
 * on the dashboard only, for the GRACE state only, and says plainly what
 * happens on the date the grace ends. Nothing renders for any other state —
 * the header pill owns those.
 *
 * Server component: no hooks, no clock reads. The date is formatted in the
 * company timezone for the same hydration reason the pill does it.
 */
export function BillingGraceBanner({
  access,
  timeZone,
  className = "",
}: BillingGraceBannerProps) {
  if (access.state !== "GRACE") {
    return null;
  }

  const graceEnds = formatGraceDate(access.graceEndsAt, timeZone);

  const description = access.canManageBilling
    ? graceEnds
      ? `Your last subscription payment did not go through. Everything keeps working until ${graceEnds}; after that the workspace is locked until billing is updated.`
      : "Your last subscription payment did not go through. Everything keeps working during the grace period; after it ends the workspace is locked until billing is updated."
    : graceEnds
      ? `The company's last subscription payment did not go through. Everything keeps working until ${graceEnds}. An owner or admin needs to update billing before then.`
      : "The company's last subscription payment did not go through. An owner or admin needs to update billing before the grace period ends.";

  return (
    <aside
      role="alert"
      aria-live="assertive"
      data-testid="billing-grace-banner"
      className={`rounded-2xl border border-amber-300/70 bg-amber-50/90 px-4 py-4 shadow-[var(--shadow-card)] sm:px-5 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold tracking-tight text-amber-950 sm:text-lg">
            Payment past due
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">
            {description}
          </p>
        </div>
        {access.canManageBilling ? (
          <Link
            href={BILLING_SETTINGS_HREF}
            className="inline-flex w-full items-center justify-center rounded-xl border border-amber-900/15 bg-white px-4 py-2 text-sm font-semibold text-amber-950 shadow-sm transition-colors hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 sm:w-auto"
          >
            Update billing
          </Link>
        ) : null}
      </div>
    </aside>
  );
}

function formatGraceDate(value: string | null, timeZone: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDateInTimeZone(date, timeZone, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
