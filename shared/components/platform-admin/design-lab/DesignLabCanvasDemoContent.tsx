import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";

export type DesignLabCanvasDemoPageId =
  | "dashboard"
  | "jobs"
  | "customers"
  | "estimates"
  | "invoices"
  | "reports";

export const DESIGN_LAB_CANVAS_DEMO_PAGES: Array<{
  id: DesignLabCanvasDemoPageId;
  label: string;
}> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "jobs", label: "Jobs" },
  { id: "customers", label: "Customers" },
  { id: "estimates", label: "Estimates" },
  { id: "invoices", label: "Invoices" },
  { id: "reports", label: "Reports" },
];

type DemoContentProps = {
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

type StatusVariant = "neutral" | "success" | "warning" | "danger";

function StatusBadge({
  label,
  variant,
  selectedTargetId,
  onSelectTarget,
}: {
  label: string;
  variant: StatusVariant;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
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

function PageHeader({
  title,
  subtitle,
  selectedTargetId,
  onSelectTarget,
}: {
  title: string;
  subtitle: string;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1.5">
        <DesignLabEditableTarget
          targetId="header-text"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="h3"
          className="text-2xl font-bold sm:text-3xl"
          style={{ color: "var(--dl-heading-text)" }}
        >
          {title}
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
  );
}

function SummaryCards({
  cards,
  selectedTargetId,
  onSelectTarget,
}: {
  cards: ReadonlyArray<{ label: string; value: string }>;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
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
  );
}

function AttentionPanel({
  selectedTargetId,
  onSelectTarget,
}: DemoContentProps) {
  const items = [
    "2 jobs need invoice review",
    "1 estimate needs follow-up",
    "Tomorrow has open dispatch capacity",
  ] as const;

  return (
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
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
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
    </DesignLabEditableTarget>
  );
}

function DemoFooter({
  selectedTargetId,
  onSelectTarget,
}: DemoContentProps) {
  return (
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
  );
}

function QueueCard({
  title,
  subtitle,
  rows,
  selectedTargetId,
  onSelectTarget,
}: {
  title: string;
  subtitle: string;
  rows: ReadonlyArray<{
    primary: string;
    secondary: string;
    status: string;
    statusVariant: StatusVariant;
  }>;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
}) {
  return (
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
          {title}
        </DesignLabEditableTarget>
        <DesignLabEditableTarget
          targetId="muted-text"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
          as="p"
          className="mt-0.5 text-xs"
          style={{ color: "var(--dl-muted-text)" }}
        >
          {subtitle}
        </DesignLabEditableTarget>
      </div>

      <ul className="divide-y" style={{ borderColor: "var(--dl-card-border)" }}>
        {rows.map((row) => (
          <li
            key={row.primary}
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
                {row.primary}
              </DesignLabEditableTarget>
              <DesignLabEditableTarget
                targetId="muted-text"
                selectedTargetId={selectedTargetId}
                onSelectTarget={onSelectTarget}
                as="p"
                className="mt-0.5 text-[11px]"
                style={{ color: "var(--dl-muted-text)" }}
              >
                {row.secondary}
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
    </DesignLabEditableTarget>
  );
}

function DashboardDemo({ selectedTargetId, onSelectTarget }: DemoContentProps) {
  return (
    <>
      <PageHeader
        title="Command Center"
        subtitle="A full-page Design Lab canvas for judging Altair colors before promotion."
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
      />
      <SummaryCards
        cards={[
          { label: "Today's work", value: "12" },
          { label: "Open invoices", value: "4" },
          { label: "Follow-ups", value: "3" },
          { label: "Capacity", value: "78%" },
        ]}
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
      />
      <div className="mt-6">
        <AttentionPanel
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      </div>
      <DemoFooter selectedTargetId={selectedTargetId} onSelectTarget={onSelectTarget} />
    </>
  );
}

function JobsDemo({ selectedTargetId, onSelectTarget }: DemoContentProps) {
  return (
    <>
      <PageHeader
        title="Today's Work"
        subtitle="Static HVAC work queue rows for previewing status badges and body text."
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
      />
      <div className="mt-6">
        <QueueCard
          title="Work queue"
          subtitle="Static demo rows — no live customer data."
          rows={[
            {
              primary: "AC diagnostic — Layton",
              secondary: "Updated 2h ago · Demo job",
              status: "Scheduled",
              statusVariant: "neutral",
            },
            {
              primary: "Furnace tune-up — Ogden",
              secondary: "Updated 4h ago · Demo job",
              status: "Needs review",
              statusVariant: "warning",
            },
            {
              primary: "Estimate follow-up — Clearfield",
              secondary: "Updated 1d ago · Demo job",
              status: "Ready",
              statusVariant: "success",
            },
            {
              primary: "Maintenance agreement — Bountiful",
              secondary: "Updated 1d ago · Demo job",
              status: "Completed",
              statusVariant: "success",
            },
            {
              primary: "No-cool callback — Roy",
              secondary: "Updated 3h ago · Demo job",
              status: "Blocked",
              statusVariant: "danger",
            },
          ]}
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      </div>
      <DemoFooter selectedTargetId={selectedTargetId} onSelectTarget={onSelectTarget} />
    </>
  );
}

function CustomersDemo({ selectedTargetId, onSelectTarget }: DemoContentProps) {
  return (
    <>
      <PageHeader
        title="Customer Workspace"
        subtitle="Static customer cards for previewing card surfaces and metadata text."
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
      />
      <div className="mt-6">
        <QueueCard
          title="Active customers"
          subtitle="Demo names and locations only."
          rows={[
            {
              primary: "Miller Residence — Layton",
              secondary: "Last service · 12 days ago · Maintenance plan",
              status: "Active",
              statusVariant: "success",
            },
            {
              primary: "Anderson Home — Ogden",
              secondary: "Last service · 3 days ago · Callback open",
              status: "Follow-up",
              statusVariant: "warning",
            },
            {
              primary: "Clearfield Property Group",
              secondary: "Last service · 28 days ago · Commercial account",
              status: "Review",
              statusVariant: "neutral",
            },
          ]}
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      </div>
      <DemoFooter selectedTargetId={selectedTargetId} onSelectTarget={onSelectTarget} />
    </>
  );
}

function EstimatesDemo({ selectedTargetId, onSelectTarget }: DemoContentProps) {
  return (
    <>
      <PageHeader
        title="Estimate Queue"
        subtitle="Static estimate rows for previewing draft, sent, and follow-up states."
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
      />
      <div className="mt-6">
        <QueueCard
          title="Open estimates"
          subtitle="Demo estimate pipeline — no live data."
          rows={[
            {
              primary: "Heat pump replacement",
              secondary: "Miller Residence · Created 2d ago",
              status: "Draft",
              statusVariant: "neutral",
            },
            {
              primary: "Furnace replacement",
              secondary: "Anderson Home · Sent 4d ago",
              status: "Sent",
              statusVariant: "success",
            },
            {
              primary: "IAQ upgrade",
              secondary: "Clearfield Property Group · Sent 6d ago",
              status: "Needs follow-up",
              statusVariant: "warning",
            },
          ]}
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      </div>
      <DemoFooter selectedTargetId={selectedTargetId} onSelectTarget={onSelectTarget} />
    </>
  );
}

function InvoicesDemo({ selectedTargetId, onSelectTarget }: DemoContentProps) {
  return (
    <>
      <PageHeader
        title="Invoice Queue"
        subtitle="Static invoice rows for previewing payment and review states."
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
      />
      <div className="mt-6">
        <QueueCard
          title="Recent invoices"
          subtitle="Demo billing queue — no live data."
          rows={[
            {
              primary: "AC diagnostic",
              secondary: "Miller Residence · Due in 5 days",
              status: "Awaiting payment",
              statusVariant: "warning",
            },
            {
              primary: "Maintenance plan",
              secondary: "Anderson Home · Paid yesterday",
              status: "Paid",
              statusVariant: "success",
            },
            {
              primary: "Callback repair",
              secondary: "Clearfield Property Group · Sent 2d ago",
              status: "Needs review",
              statusVariant: "danger",
            },
          ]}
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      </div>
      <DemoFooter selectedTargetId={selectedTargetId} onSelectTarget={onSelectTarget} />
    </>
  );
}

function ReportsDemo({ selectedTargetId, onSelectTarget }: DemoContentProps) {
  return (
    <>
      <PageHeader
        title="Performance Snapshot"
        subtitle="Static report cards for previewing summary metrics and card surfaces."
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
      />
      <SummaryCards
        cards={[
          { label: "Revenue preview", value: "$42.8k" },
          { label: "Close rate", value: "61%" },
          { label: "Invoice cycle", value: "4.2 days" },
          { label: "Technician capacity", value: "78%" },
        ]}
        selectedTargetId={selectedTargetId}
        onSelectTarget={onSelectTarget}
      />
      <DemoFooter selectedTargetId={selectedTargetId} onSelectTarget={onSelectTarget} />
    </>
  );
}

type DesignLabCanvasDemoContentProps = DemoContentProps & {
  pageId: DesignLabCanvasDemoPageId;
};

export function DesignLabCanvasDemoContent({
  pageId,
  selectedTargetId,
  onSelectTarget,
}: DesignLabCanvasDemoContentProps) {
  switch (pageId) {
    case "dashboard":
      return (
        <DashboardDemo
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      );
    case "jobs":
      return (
        <JobsDemo selectedTargetId={selectedTargetId} onSelectTarget={onSelectTarget} />
      );
    case "customers":
      return (
        <CustomersDemo
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      );
    case "estimates":
      return (
        <EstimatesDemo
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      );
    case "invoices":
      return (
        <InvoicesDemo
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      );
    case "reports":
      return (
        <ReportsDemo
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectTarget}
        />
      );
  }
}
