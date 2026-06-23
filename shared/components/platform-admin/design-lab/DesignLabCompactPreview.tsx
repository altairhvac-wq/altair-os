import { designLabPreviewVars } from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

type DesignLabCompactPreviewProps = {
  colors: DesignLabColors;
};

export function DesignLabCompactPreview({ colors }: DesignLabCompactPreviewProps) {
  return (
    <div className="design-lab-preview p-4 sm:p-5" style={designLabPreviewVars(colors)}>
      <div
        className="rounded-[1rem] p-4 sm:p-5"
        style={{ backgroundColor: "var(--dl-page-bg)" }}
      >
        <div className="space-y-1">
          <h3 className="text-lg font-bold" style={{ color: "var(--dl-heading-text)" }}>
            Service dashboard
          </h3>
          <p className="text-sm" style={{ color: "var(--dl-muted-text)" }}>
            Preview shell for headings, cards, and actions.
          </p>
        </div>

        <div
          className="mt-4 rounded-[0.875rem] border p-4"
          style={{
            backgroundColor: "var(--dl-card-bg)",
            borderColor: "var(--dl-card-border)",
          }}
        >
          <h4 className="text-base font-semibold" style={{ color: "var(--dl-body-text)" }}>
            Today&apos;s jobs
          </h4>
          <p className="mt-1 text-sm" style={{ color: "var(--dl-body-text)" }}>
            Body text shows how readable copy feels on card surfaces.
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--dl-muted-text)" }}>
            Muted text for timestamps, metadata, and helper lines.
          </p>

          <div
            className="mt-3 rounded-lg border p-3"
            style={{
              backgroundColor: "var(--dl-card-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--dl-body-text)" }}>
              Nested section
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--dl-muted-text)" }}>
              A smaller card inside the main surface.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--dl-primary-bg)",
                color: "var(--dl-primary-text)",
              }}
            >
              Primary action
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "var(--dl-secondary-bg)",
                color: "var(--dl-secondary-text)",
              }}
            >
              Secondary action
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "var(--dl-success-bg)",
                color: "var(--dl-body-text)",
              }}
            >
              Success
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "var(--dl-warning-bg)",
                color: "var(--dl-body-text)",
              }}
            >
              Warning
            </span>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "var(--dl-danger-bg)",
                color: "var(--dl-body-text)",
              }}
            >
              Danger
            </span>
          </div>
        </div>

        <p className="mt-3 text-[11px]" style={{ color: "var(--dl-muted-text)" }}>
          Preview CSS variables are scoped to this panel only.
        </p>
      </div>
    </div>
  );
}
