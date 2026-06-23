"use client";

import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  evaluateDesignLabContrast,
  formatContrastRatio,
  getContrastOverallStatus,
  getOverallStatusLabel,
  ratingLabel,
  type ContrastRating,
} from "@/shared/components/platform-admin/design-lab/design-lab-contrast";

type DesignLabContrastPanelProps = {
  colors: DesignLabColors;
};

function ratingStyles(rating: ContrastRating | null): {
  badge: string;
  row: string;
} {
  if (rating === null) {
    return {
      badge: "border-[rgba(138,99,36,0.18)] bg-[#F5F0E4] text-[#6B6255]",
      row: "border-[rgba(138,99,36,0.12)] bg-[#FBF7EF]",
    };
  }

  switch (rating) {
    case "good":
      return {
        badge: "border-[rgba(47,107,58,0.22)] bg-[#EAF4E8] text-[#2F6B3A]",
        row: "border-[rgba(47,107,58,0.14)] bg-[#F7FBF6]",
      };
    case "caution":
      return {
        badge: "border-[rgba(184,148,63,0.28)] bg-[#FFF3D6] text-[#8A6324]",
        row: "border-[rgba(184,148,63,0.18)] bg-[#FFFBF2]",
      };
    case "poor":
      return {
        badge: "border-[rgba(154,52,18,0.22)] bg-[#FCECE7] text-[#9A3412]",
        row: "border-[rgba(154,52,18,0.16)] bg-[#FFF7F4]",
      };
  }
}

function overallStatusStyles(
  status: ReturnType<typeof getContrastOverallStatus>,
): string {
  switch (status) {
    case "all-good":
      return "border-[rgba(47,107,58,0.2)] bg-[#EAF4E8] text-[#2F6B3A]";
    case "needs-review":
      return "border-[rgba(184,148,63,0.24)] bg-[#FFF3D6] text-[#8A6324]";
    case "poor-detected":
      return "border-[rgba(154,52,18,0.2)] bg-[#FCECE7] text-[#9A3412]";
  }
}

export function DesignLabContrastPanel({ colors }: DesignLabContrastPanelProps) {
  const checks = evaluateDesignLabContrast(colors);
  const overallStatus = getContrastOverallStatus(checks);

  return (
    <section
      aria-label="Readability guardrails"
      className="overflow-hidden rounded-[1.25rem] border border-[rgba(138,99,36,0.16)] shadow-[0_4px_16px_rgba(23,19,14,0.06)]"
    >
      <div className="border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-2.5 sm:px-4">
        <h2 className="text-sm font-semibold text-[#17130E]">Readability guardrails</h2>
        <p className="mt-0.5 text-xs leading-snug text-[#6B6255]">
          These checks only evaluate the preview. Nothing is saved or applied to
          customer pages.
        </p>
      </div>

      <div className="space-y-3 bg-[#FFF9EA] p-3 sm:p-4">
        <div
          className={[
            "rounded-lg border px-3 py-2 text-xs font-semibold",
            overallStatusStyles(overallStatus),
          ].join(" ")}
        >
          {getOverallStatusLabel(overallStatus)}
        </div>

        <ul className="space-y-2">
          {checks.map((check) => {
            const styles = ratingStyles(check.rating);

            return (
              <li
                key={check.id}
                className={[
                  "rounded-lg border px-3 py-2.5",
                  styles.row,
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-[#17130E]">{check.name}</p>
                  <span
                    className={[
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]",
                      styles.badge,
                    ].join(" ")}
                  >
                    {ratingLabel(check.rating)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-[#4F4638]">
                  {formatContrastRatio(check.ratio)}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#6B6255]">
                  {check.helperText}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
