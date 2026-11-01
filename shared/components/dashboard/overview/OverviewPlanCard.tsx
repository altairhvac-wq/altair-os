import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";
import { getMissionControlUpgradeCardModel } from "@/shared/components/dashboard/mission-control-v2/upgrade-card-model";
import { OVERVIEW_CARD_CLASS } from "./overview-chrome";

/**
 * The plan / trial slot from the reference's sidebar, rendered in the
 * dashboard's own column so the shell stays untouched. Content comes from the
 * same model the Mission Control upgrade card used.
 */
export function OverviewPlanCard({ access }: { access: CompanyBillingAccess }) {
  const model = getMissionControlUpgradeCardModel(access);
  const cta = model.emphasis === "cta";

  const body = (
    <div className="flex items-start gap-3 p-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          cta ? "bg-altair-brass text-[#1C1913]" : "bg-altair-paper-subtle text-altair-ink-on-paper-secondary"
        }`}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-altair-ink-on-paper-muted">
          {model.sectionTitle}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-altair-ink-on-paper">
          {model.headline}
        </p>
        {model.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
            {model.description}
          </p>
        ) : null}
        {model.href ? (
          <span
            className={`mt-2.5 inline-flex rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-bold ${
              cta
                ? "bg-altair-brass text-[#1C1913]"
                : "border border-altair-border/60 text-altair-ink-on-paper"
            }`}
          >
            {model.variant === "explore_pro"
              ? "See plans"
              : model.variant === "trial"
                ? "Manage plan"
                : "Subscription"}
          </span>
        ) : null}
      </div>
    </div>
  );

  return model.href ? (
    <Link
      href={model.href}
      className={`${OVERVIEW_CARD_CLASS} block transition-colors hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]`}
    >
      {body}
    </Link>
  ) : (
    <div className={OVERVIEW_CARD_CLASS}>{body}</div>
  );
}
