import type { PlatformActivationFunnel } from "@/shared/types/platform-admin";
import { pt } from "@/shared/components/platform-admin/north-star-m13/platform-north-star-styles";

type PlatformActivationFunnelPanelProps = {
  funnel: PlatformActivationFunnel;
  northStar?: boolean;
};

type FunnelStep = {
  label: string;
  value: number;
  total: number;
};

function buildSteps(funnel: PlatformActivationFunnel): FunnelStep[] {
  const total = funnel.totalCompanies;

  const steps: FunnelStep[] = [
    { label: "Total companies", value: funnel.totalCompanies, total },
    { label: "First customer", value: funnel.withFirstCustomer, total },
    { label: "First job", value: funnel.withFirstJob, total },
    { label: "First estimate", value: funnel.withFirstEstimate, total },
    { label: "First invoice", value: funnel.withFirstInvoice, total },
  ];

  if (funnel.withFirstPayment != null) {
    steps.push({
      label: "First payment",
      value: funnel.withFirstPayment,
      total,
    });
  }

  steps.push({
    label: "Fully activated",
    value: funnel.fullyActivated,
    total,
  });

  return steps;
}

function formatPercent(value: number, total: number): string {
  if (total === 0) {
    return "0%";
  }

  return `${Math.round((value / total) * 100)}%`;
}

function FunnelStepRow({
  step,
  northStar,
  isFirst,
}: {
  step: FunnelStep;
  northStar: boolean;
  isFirst: boolean;
}) {
  const percent = formatPercent(step.value, step.total);

  return (
    <div
      className={
        northStar
          ? "min-w-0 rounded-[0.875rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] p-3"
          : "min-w-0 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
      }
    >
      <p
        className={
          northStar
            ? "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B6255]"
            : "text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
        }
      >
        {step.label}
      </p>
      <p
        className={
          northStar
            ? "mt-1 text-lg font-bold tabular-nums text-[#17130E]"
            : "mt-1 text-lg font-bold tabular-nums text-slate-900"
        }
      >
        {step.value.toLocaleString()}
      </p>
      {!isFirst && step.total > 0 ? (
        <div className="mt-2">
          <div
            className={
              northStar
                ? "h-1.5 overflow-hidden rounded-full bg-[#EFE4CB]"
                : "h-1.5 overflow-hidden rounded-full bg-slate-200"
            }
            role="progressbar"
            aria-valuenow={step.value}
            aria-valuemin={0}
            aria-valuemax={step.total}
            aria-label={`${step.label} activation rate`}
          >
            <div
              className={
                northStar
                  ? "h-full rounded-full bg-[#C9A44D]"
                  : "h-full rounded-full bg-cyan-500"
              }
              style={{
                width: `${step.total === 0 ? 0 : Math.max(4, (step.value / step.total) * 100)}%`,
              }}
            />
          </div>
          <p
            className={
              northStar
                ? "mt-1 text-[11px] font-medium text-[#8A6324]"
                : "mt-1 text-[11px] font-medium text-slate-600"
            }
          >
            {percent} of companies
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function PlatformActivationFunnelPanel({
  funnel,
  northStar = false,
}: PlatformActivationFunnelPanelProps) {
  const steps = buildSteps(funnel);

  if (northStar) {
    return (
      <section
        className={pt.sectionSurface}
        aria-label="Cross-tenant activation funnel"
        id="platform-activation-funnel"
      >
        <div className={pt.panelHeader}>
          <p className={pt.sectionEyebrow}>Beta health</p>
          <h2 className={`mt-0.5 ${pt.sectionTitle}`}>Activation funnel</h2>
          <p className={pt.sectionSubtitle}>
            Cross-tenant onboarding progress from signup through the money path.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 p-3 sm:grid-cols-3 sm:gap-3 sm:p-4 lg:grid-cols-4 lg:px-5">
          {steps.map((step, index) => (
            <FunnelStepRow
              key={step.label}
              step={step}
              northStar
              isFirst={index === 0}
            />
          ))}
        </div>
        {funnel.totalCompanies === 0 ? (
          <p className="px-3 pb-4 text-sm text-[#4F4638] sm:px-4 lg:px-5">
            No companies on the platform yet — funnel metrics will appear after
            the first signup.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="admin-card admin-card-body"
      aria-label="Cross-tenant activation funnel"
      id="platform-activation-funnel"
    >
      <h2 className="text-sm font-bold text-slate-900">Activation funnel</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Cross-tenant onboarding progress from signup through the money path.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {steps.map((step, index) => (
          <FunnelStepRow
            key={step.label}
            step={step}
            northStar={false}
            isFirst={index === 0}
          />
        ))}
      </div>
      {funnel.totalCompanies === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No companies on the platform yet — funnel metrics will appear after the
          first signup.
        </p>
      ) : null}
    </section>
  );
}
