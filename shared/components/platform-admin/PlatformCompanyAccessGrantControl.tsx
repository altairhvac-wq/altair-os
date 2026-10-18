"use client";

import { useTransition } from "react";
import {
  clearCompanyBetaCompAction,
  grantCompanyBetaCompAction,
} from "@/app/actions/platform-access-grants";
import { toast } from "@/shared/design-system/feedback";
import type { PlatformAdminCompanyRow } from "@/shared/types/platform-admin";

type PlatformCompanyAccessGrantControlProps = {
  company: Pick<
    PlatformAdminCompanyRow,
    "id" | "name" | "accessGrant" | "subscriptionStatus"
  >;
  northStar?: boolean;
};

function statusLabel(status: string | null): string {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Past due";
    case "incomplete":
      return "Unpaid";
    case "canceled":
      return "Canceled";
    case null:
      return "No row";
    default:
      return status.replace(/_/g, " ");
  }
}

/**
 * The /platform control that sets or clears `access_grant='beta_comped'`.
 *
 * The buttons call Server Actions that re-check platform-admin authorization
 * themselves; rendering this control is a convenience, not a permission.
 */
export function PlatformCompanyAccessGrantControl({
  company,
  northStar = false,
}: PlatformCompanyAccessGrantControlProps) {
  const [isPending, startTransition] = useTransition();
  const comped = company.accessGrant === "beta_comped";

  const badgeClass = comped
    ? northStar
      ? "bg-[rgba(22,101,52,0.1)] text-[#166534] ring-[rgba(22,101,52,0.16)]"
      : "bg-emerald-50 text-emerald-800 ring-emerald-600/10"
    : northStar
      ? "bg-[rgba(124,114,89,0.1)] text-[#5C5340] ring-[rgba(124,114,89,0.16)]"
      : "bg-slate-100 text-slate-600 ring-slate-600/10";

  const buttonClass = northStar
    ? "rounded-full border border-[rgba(119,89,27,0.24)] bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#5C4512] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    : "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  function run() {
    const confirmed = window.confirm(
      comped
        ? `Remove complimentary access from ${company.name}? Unless they have a paid subscription they will be sent to billing activation on their next page load.`
        : `Give ${company.name} complimentary (beta) access? They skip billing activation until this is removed.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = comped
        ? await clearCompanyBetaCompAction(company.id)
        : await grantCompanyBetaCompAction(company.id);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.success ?? "Access grant updated.");
    });
  }

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${badgeClass}`}
        title={`access_grant=${company.accessGrant} · status=${company.subscriptionStatus ?? "none"}`}
      >
        {comped ? "Comped" : statusLabel(company.subscriptionStatus)}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={isPending}
        onClick={run}
        aria-label={
          comped
            ? `Remove complimentary access from ${company.name}`
            : `Give ${company.name} complimentary access`
        }
      >
        {isPending ? "Saving…" : comped ? "Remove comp" : "Comp (beta)"}
      </button>
    </div>
  );
}
