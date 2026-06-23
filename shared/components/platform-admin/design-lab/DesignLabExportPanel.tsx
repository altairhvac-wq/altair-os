"use client";

import { useMemo, useState } from "react";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  buildDesignLabThemeExport,
  getContrastSummary,
} from "@/shared/components/platform-admin/design-lab/design-lab-export";
import { evaluateDesignLabContrast } from "@/shared/components/platform-admin/design-lab/design-lab-contrast";

type DesignLabExportPanelProps = {
  colors: DesignLabColors;
};

type CopyState = "idle" | "success" | "error";

export function DesignLabExportPanel({ colors }: DesignLabExportPanelProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  const checks = useMemo(() => evaluateDesignLabContrast(colors), [colors]);
  const contrastSummary = useMemo(
    () => getContrastSummary(checks),
    [checks],
  );
  const exportText = useMemo(
    () => buildDesignLabThemeExport(colors, contrastSummary),
    [colors, contrastSummary],
  );

  async function handleCopy() {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await navigator.clipboard.writeText(exportText);
      setCopyState("success");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2500);
    }
  }

  const copyLabel =
    copyState === "success"
      ? "Copied"
      : copyState === "error"
        ? "Copy failed"
        : "Copy theme export";

  return (
    <section
      aria-label="Export approved theme"
      className="overflow-hidden rounded-[1.25rem] border border-[rgba(138,99,36,0.16)] shadow-[0_4px_16px_rgba(23,19,14,0.06)]"
    >
      <div className="border-b border-[rgba(138,99,36,0.12)] bg-[#F5F0E4] px-3 py-2.5 sm:px-4">
        <h2 className="text-sm font-semibold text-[#17130E]">Export approved theme</h2>
        <p className="mt-0.5 text-xs leading-snug text-[#6B6255]">
          Copy the current preview palette so it can be promoted into Altair&apos;s
          real design tokens in a later safe phase. Exporting does not save or
          change customer pages.
        </p>
      </div>

      <div className="space-y-3 bg-[#FFF9EA] p-3 sm:p-4">
        <div className="rounded-lg border border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] px-3 py-2 text-xs text-[#4F4638]">
          <p className="font-semibold text-[#17130E]">Readability summary</p>
          <p className="mt-0.5">{contrastSummary.overallLabel}</p>
          <p className="mt-0.5 font-mono text-[11px] text-[#6B6255]">
            Poor checks: {contrastSummary.poorCount} · Caution checks:{" "}
            {contrastSummary.cautionCount}
          </p>
        </div>

        <div>
          <label
            htmlFor="design-lab-theme-export"
            className="block text-xs font-semibold text-[#17130E]"
          >
            Theme export
          </label>
          <textarea
            id="design-lab-theme-export"
            readOnly
            value={exportText}
            rows={18}
            spellCheck={false}
            className="mt-1.5 w-full resize-y rounded-lg border border-[rgba(138,99,36,0.18)] bg-white px-3 py-2 font-mono text-[11px] leading-relaxed text-[#17130E] outline-none focus:border-[#B8943F] focus:ring-2 focus:ring-[#B8943F]/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={[
              "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
              copyState === "success"
                ? "border-[rgba(47,107,58,0.28)] bg-[#EAF4E8] text-[#2F6B3A]"
                : copyState === "error"
                  ? "border-[rgba(154,52,18,0.22)] bg-[#FCECE7] text-[#9A3412]"
                  : "border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] text-[#17130E] hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD]",
            ].join(" ")}
          >
            {copyLabel}
          </button>
          {copyState === "error" ? (
            <p className="text-[11px] text-[#9A3412]">
              Clipboard unavailable. Select the text above and copy manually.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
