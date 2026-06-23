import { designLabPreviewVars } from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

type DesignLabFullPagePreviewProps = {
  colors: DesignLabColors;
};

const SUMMARY_CARDS = [
  { label: "Open jobs", value: "12" },
  { label: "Awaiting invoice", value: "4" },
  { label: "Needs follow-up", value: "3" },
] as const;

const WORK_ROWS = [
  { title: "AC diagnostic — Layton", status: "Scheduled", statusVariant: "neutral" as const },
  { title: "Furnace tune-up — Ogden", status: "Needs review", statusVariant: "warning" as const },
  { title: "Estimate follow-up — Clearfield", status: "Ready", statusVariant: "success" as const },
  { title: "Maintenance agreement — Bountiful", status: "Completed", statusVariant: "success" as const },
] as const;

const ATTENTION_ITEMS = [
  "2 jobs need invoice review",
  "1 estimate needs follow-up",
  "Tomorrow has open dispatch capacity",
] as const;

function StatusBadge({
  label,
  variant,
}: {
  label: string;
  variant: "neutral" | "success" | "warning";
}) {
  const style =
    variant === "success"
      ? { backgroundColor: "var(--dl-success-bg)", color: "var(--dl-body-text)" }
      : variant === "warning"
        ? { backgroundColor: "var(--dl-warning-bg)", color: "var(--dl-body-text)" }
        : {
            backgroundColor: "var(--dl-card-bg)",
            color: "var(--dl-body-text)",
            border: "1px solid var(--dl-card-border)",
          };

  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={style}
    >
      {label}
    </span>
  );
}

export function DesignLabFullPagePreview({ colors }: DesignLabFullPagePreviewProps) {
  return (
    <div
      className="design-lab-preview min-h-[32rem] p-3 sm:p-4"
      style={designLabPreviewVars(colors)}
    >
      <div
        className="rounded-[0.875rem] p-4 sm:p-5 lg:p-6"
        style={{ backgroundColor: "var(--dl-page-bg)" }}
      >
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-bold sm:text-2xl" style={{ color: "var(--dl-heading-text)" }}>
              Today&apos;s Work
            </h3>
            <p className="text-sm" style={{ color: "var(--dl-muted-text)" }}>
              A preview of how this palette feels across an Altair workspace.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg px-3.5 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--dl-primary-bg)",
                color: "var(--dl-primary-text)",
              }}
            >
              Dispatch board
            </button>
            <button
              type="button"
              className="rounded-lg px-3.5 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--dl-secondary-bg)",
                color: "var(--dl-secondary-text)",
              }}
            >
              New job
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {SUMMARY_CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-[0.75rem] border p-3.5"
              style={{
                backgroundColor: "var(--dl-card-bg)",
                borderColor: "var(--dl-card-border)",
              }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--dl-muted-text)" }}>
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-bold" style={{ color: "var(--dl-body-text)" }}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
          {/* Work queue */}
          <div
            className="rounded-[0.75rem] border"
            style={{
              backgroundColor: "var(--dl-card-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <div
              className="border-b px-4 py-3"
              style={{ borderColor: "var(--dl-card-border)" }}
            >
              <h4 className="text-sm font-semibold" style={{ color: "var(--dl-body-text)" }}>
                Work queue
              </h4>
              <p className="mt-0.5 text-xs" style={{ color: "var(--dl-muted-text)" }}>
                Static demo rows — no live customer data.
              </p>
            </div>

            <ul className="divide-y" style={{ borderColor: "var(--dl-card-border)" }}>
              {WORK_ROWS.map((row) => (
                <li
                  key={row.title}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                  style={{ borderColor: "var(--dl-card-border)" }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" style={{ color: "var(--dl-body-text)" }}>
                      {row.title}
                    </p>
                    <p className="mt-0.5 text-[11px]" style={{ color: "var(--dl-muted-text)" }}>
                      Updated 2h ago · Demo job
                    </p>
                  </div>
                  <StatusBadge label={row.status} variant={row.statusVariant} />
                </li>
              ))}
            </ul>

            {/* Empty/small helper state */}
            <div
              className="border-t px-4 py-3"
              style={{ borderColor: "var(--dl-card-border)" }}
            >
              <p className="text-xs" style={{ color: "var(--dl-muted-text)" }}>
                No additional rows in this demo preview.
              </p>
            </div>
          </div>

          {/* Attention card */}
          <div
            className="rounded-[0.75rem] border p-4"
            style={{
              backgroundColor: "var(--dl-card-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold" style={{ color: "var(--dl-body-text)" }}>
                Attention
              </h4>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: "var(--dl-warning-bg)",
                  color: "var(--dl-body-text)",
                }}
              >
                Warning
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {ATTENTION_ITEMS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-xs leading-snug"
                  style={{ color: "var(--dl-body-text)" }}
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--dl-warning-bg)" }}
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>

            {/* Success state example */}
            <div
              className="mt-4 rounded-lg border px-3 py-2.5"
              style={{
                backgroundColor: "var(--dl-success-bg)",
                borderColor: "var(--dl-card-border)",
              }}
            >
              <p className="text-xs font-semibold" style={{ color: "var(--dl-body-text)" }}>
                3 jobs completed today
              </p>
              <p className="mt-0.5 text-[11px]" style={{ color: "var(--dl-muted-text)" }}>
                Success state preview
              </p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px]" style={{ color: "var(--dl-muted-text)" }}>
          Full page preview uses static demo content only. It does not load customer data or
          change live pages.
        </p>
      </div>
    </div>
  );
}
