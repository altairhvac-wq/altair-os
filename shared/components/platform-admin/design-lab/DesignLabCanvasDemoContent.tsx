import { DesignLabWorkspaceDemo } from "@/shared/components/platform-admin/design-lab/DesignLabWorkspaceDemo";
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

type DesignLabCanvasDemoContentProps = {
  pageId: DesignLabCanvasDemoPageId;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

const PAGE_COPY: Record<
  DesignLabCanvasDemoPageId,
  { title: string; subtitle: string }
> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Mission Control chrome — use Dashboard replica canvas for full fidelity.",
  },
  jobs: {
    title: "Jobs",
    subtitle: "Hub plate language on the content well.",
  },
  customers: {
    title: "Customers",
    subtitle: "Sharp MC surfaces · hairline grid.",
  },
  estimates: {
    title: "Estimates",
    subtitle: "Sales hub preview using live surface tokens.",
  },
  invoices: {
    title: "Invoices",
    subtitle: "Billing hub preview using live surface tokens.",
  },
  reports: {
    title: "Reports",
    subtitle: "Reports uses the dark register in product — this demo stays on MC light plates.",
  },
};

export function DesignLabCanvasDemoContent({
  pageId,
  selectedTargetId,
  onSelectTarget,
}: DesignLabCanvasDemoContentProps) {
  const copy = PAGE_COPY[pageId];

  return (
    <DesignLabWorkspaceDemo
      selectedTargetId={selectedTargetId}
      onSelectTarget={onSelectTarget}
      subtitle={`${copy.title}: ${copy.subtitle}`}
      layout="canvas"
    />
  );
}
