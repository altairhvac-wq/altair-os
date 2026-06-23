import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";

type DesignLabWorkspaceDemoProps = {
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
  subtitle: string;
  layout?: "embedded" | "canvas";
};

const SUMMARY_CARDS = [
  { label: "Open jobs", value: "12" },
  { label: "Awaiting invoice", value: "4" },
  { label: "Needs follow-up", value: "3" },
  { label: "Capacity", value: "78%" },
] as const;

const WORK_ROWS = [
  { title: "AC diagnostic — Layton", status: "Scheduled", statusVariant: "neutral" as const },
  { title: "Furnace tune-up — Ogden", status: "Needs review", statusVariant: "warning" as const },
  { title: "Estimate follow-up — Clearfield", status: "Ready", statusVariant: "success" as const },
  { title: "Maintenance agreement — Bountiful", status: "Completed", statusVariant: "success" as const },
  { title: "No-cool callback — Roy", status: "Blocked", statusVariant: "danger" as const },
] as const;

const ATTENTION_ITEMS = [
  "2 jobs need invoice review",
  "1 estimate needs follow-up",
  "Tomorrow has open dispatch capacity",
] as const;

type StatusBadgeProps = {
  label: string;
  variant: "neutral" | "success" | "warning" | "danger";
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

function StatusBadge({
  label,
  variant,
  selectedTargetId,
  onSelectTarget,
}: StatusBadgeProps) {
  if (variant === "success") {
    return (
      <DesignLabEditableTarget
        targetId="success-badge"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        as="span"
        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{
          backgroundColor: "var(--dl-success-bg)",
          color: "var(--dl-body-text)",
        }}
      >
        {label}
      </DesignLabEditableTarget>
    );
  }

  if (variant === "warning") {
    return (
      <DesignLabEditableTarget
        targetId="warning-badge"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        as="span"
        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{
          backgroundColor: "var(--dl-warning-bg)",
          color: "var(--dl-body-text)",
        }}
      >
        {label}
      </DesignLabEditableTarget>
    );
  }

  if (variant === "danger") {
    return (
      <DesignLabEditableTarget
        targetId="danger-badge"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        as="span"
        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{
          backgroundColor: "var(--dl-danger-bg)",
          color: "var(--dl-body-text)",
        }}
      >
        {label}
      </DesignLabEditableTarget>
    );
  }

  return (
    <span
      className="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{
        backgroundColor: "var(--dl-card-bg)",
        color: "var(--dl-body-text)",
        borderColor: "var(--dl-card-border)",
      }}
    >
      {label}
    </span>
  );
}

export function DesignLabWorkspaceDemo({
  selectedTargetId,
  onSelectTarget,
  subtitle,
  layout = "embedded",
}: DesignLabWorkspaceDemoProps) {
  const isCanvas = layout === "canvas";
  const summaryGridClass = isCanvas
    ? "mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    : "mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4";
  const mainGridClass = isCanvas
    ? "mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]"
    : "mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]";
  const titleClass = isCanvas
    ? "text-2xl font-bold sm:text-3xl"
    : "text-xl font-bold sm:text-2xl";

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <DesignLabEditableTarget
            targetId="header-text"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="h3"
            className={titleClass}
            style={{ color: "var(--dl-heading-text)" }}
          >
            Today&apos;s Work
          </DesignLabEditableTarget>
          <DesignLabEditableTarget
            targetId="muted-text"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="p"
            className="max-w-2xl text-sm"
            style={{ color: "var(--dl-muted-text)" }}
          >
            {subtitle}
          </DesignLabEditableTarget>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <DesignLabEditableTarget
            targetId="primary-action"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="button"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold"
            style={{
              backgroundColor: "var(--dl-primary-bg)",
              color: "var(--dl-primary-text)",
            }}
          >
            Dispatch board
          </DesignLabEditableTarget>
          <DesignLabEditableTarget
            targetId="secondary-action"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            as="button"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold"
            style={{
              backgroundColor: "var(--dl-secondary-bg)",
              color: "var(--dl-secondary-text)",
            }}
          >
            New job
          </DesignLabEditableTarget>
        </div>
      </div>

      <div className={summaryGridClass}>
        {SUMMARY_CARDS.map((card) => (
          <DesignLabEditableTarget
            key={card.label}
            targetId="card-surface"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="rounded-[0.75rem] border p-4"
            style={{
              backgroundColor: "var(--dl-card-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <DesignLabEditableTarget
              targetId="muted-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="text-xs font-medium"
              style={{ color: "var(--dl-muted-text)" }}
            >
              {card.label}
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="body-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="mt-1 text-2xl font-bold"
              style={{ color: "var(--dl-body-text)" }}
            >
              {card.value}
            </DesignLabEditableTarget>
          </DesignLabEditableTarget>
        ))}
      </div>

      <div className={mainGridClass}>
        <DesignLabEditableTarget
          targetId="card-surface"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          className="rounded-[0.75rem] border"
          style={{
            backgroundColor: "var(--dl-card-bg)",
            borderColor: "var(--dl-card-border)",
          }}
        >
          <div
            className="border-b px-4 py-3.5"
            style={{ borderColor: "var(--dl-card-border)" }}
          >
            <DesignLabEditableTarget
              targetId="body-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="h4"
              className="text-sm font-semibold"
              style={{ color: "var(--dl-body-text)" }}
            >
              Work queue
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="muted-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="mt-0.5 text-xs"
              style={{ color: "var(--dl-muted-text)" }}
            >
              Static demo rows — no live customer data.
            </DesignLabEditableTarget>
          </div>

          <ul className="divide-y" style={{ borderColor: "var(--dl-card-border)" }}>
            {WORK_ROWS.map((row) => (
              <li
                key={row.title}
                className="flex items-center justify-between gap-3 px-4 py-3.5"
                style={{ borderColor: "var(--dl-card-border)" }}
              >
                <div className="min-w-0">
                  <DesignLabEditableTarget
                    targetId="body-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="truncate text-sm font-medium"
                    style={{ color: "var(--dl-body-text)" }}
                  >
                    {row.title}
                  </DesignLabEditableTarget>
                  <DesignLabEditableTarget
                    targetId="muted-text"
                    selectedTargetId={selectedTargetId}
                    onSelectTarget={onSelectTarget}
                    as="p"
                    className="mt-0.5 text-[11px]"
                    style={{ color: "var(--dl-muted-text)" }}
                  >
                    Updated 2h ago · Demo job
                  </DesignLabEditableTarget>
                </div>
                <StatusBadge
                  label={row.status}
                  variant={row.statusVariant}
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                />
              </li>
            ))}
          </ul>

          <div
            className="border-t px-4 py-3.5"
            style={{ borderColor: "var(--dl-card-border)" }}
          >
            <DesignLabEditableTarget
              targetId="muted-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="text-xs"
              style={{ color: "var(--dl-muted-text)" }}
            >
              No additional rows in this demo preview.
            </DesignLabEditableTarget>
          </div>
        </DesignLabEditableTarget>

        <DesignLabEditableTarget
          targetId="card-surface"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          className="rounded-[0.75rem] border p-4"
          style={{
            backgroundColor: "var(--dl-card-bg)",
            borderColor: "var(--dl-card-border)",
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <DesignLabEditableTarget
              targetId="body-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="h4"
              className="text-sm font-semibold"
              style={{ color: "var(--dl-body-text)" }}
            >
              Attention
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="warning-badge"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="span"
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: "var(--dl-warning-bg)",
                color: "var(--dl-body-text)",
              }}
            >
              Warning
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="danger-badge"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="span"
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: "var(--dl-danger-bg)",
                color: "var(--dl-body-text)",
              }}
            >
              Blocked
            </DesignLabEditableTarget>
          </div>
          <ul className="mt-3 space-y-2.5">
            {ATTENTION_ITEMS.map((item) => (
              <li key={item}>
                <DesignLabEditableTarget
                  targetId="body-text"
                  selectedTargetId={selectedTargetId}
                  onSelectTarget={onSelectTarget}
                  className="flex items-start gap-2 text-xs leading-snug"
                  style={{ color: "var(--dl-body-text)" }}
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "var(--dl-warning-bg)" }}
                    aria-hidden
                  />
                  {item}
                </DesignLabEditableTarget>
              </li>
            ))}
          </ul>

          <DesignLabEditableTarget
            targetId="success-badge"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="mt-4 rounded-lg border px-3 py-2.5"
            style={{
              backgroundColor: "var(--dl-success-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <DesignLabEditableTarget
              targetId="body-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="text-xs font-semibold"
              style={{ color: "var(--dl-body-text)" }}
            >
              3 jobs completed today
            </DesignLabEditableTarget>
            <DesignLabEditableTarget
              targetId="muted-text"
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              as="p"
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--dl-muted-text)" }}
            >
              Success state preview
            </DesignLabEditableTarget>
          </DesignLabEditableTarget>
        </DesignLabEditableTarget>
      </div>

      <DesignLabEditableTarget
        targetId="muted-text"
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
        as="p"
        className="mt-5 text-[11px]"
        style={{ color: "var(--dl-muted-text)" }}
      >
        Static demo content only. It does not load customer data or change live pages.
      </DesignLabEditableTarget>
    </>
  );
}
