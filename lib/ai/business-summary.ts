import "server-only";

import { trimAiText } from "@/lib/ai/limits";
import type { GenerateDraftTextRequest } from "@/lib/ai/types";
import { formatCurrency } from "@/shared/types/customer";
import type { ReportsPageData } from "@/shared/types/reports-page";

export const BUSINESS_SUMMARY_AI_FEATURE = "business-summary";

const BUSINESS_SUMMARY_PROMPT = `You write a plain-English business review for a trades company owner (HVAC, electrical, plumbing, or general service).

Output requirements:
- Start with 3 to 5 bullet points using the bullet character (•)
- Each bullet should be one concise sentence about revenue, cash flow, sales conversion, or operational health
- After the bullets, add a blank line, then one line prefixed exactly with "Recommended next action:"
- Professional, calm, owner-friendly tone — not alarmist unless data clearly warrants it

Rules:
- Use only facts from the context below — do not invent numbers, customers, or risks
- Do not claim tax filing, legal compliance, or guaranteed outcomes
- Do not say "AI thinks" or similar phrasing
- Plain text only — no markdown headings`;

export type BusinessSummaryDraftInput = {
  reports: ReportsPageData;
};

function formatFunnelSummary(reports: ReportsPageData): string {
  return reports.salesFunnel
    .map((stage) => `${stage.label}: ${stage.count}`)
    .join("; ");
}

function formatTechnicianSummary(reports: ReportsPageData): string {
  if (
    !reports.showTechnicianProfitability ||
    reports.technicianProfitability.length === 0
  ) {
    return "Technician profitability: not available or no completed work in period.";
  }

  return reports.technicianProfitability
    .slice(0, 3)
    .map((tech) => {
      const profitPart =
        tech.profitAvailable && tech.grossProfit != null
          ? `${formatCurrency(tech.grossProfit)} gross profit`
          : `${formatCurrency(tech.revenue)} revenue`;
      return `${tech.name} — ${profitPart}, ${tech.laborHours} labor hours`;
    })
    .join("; ");
}

export function prepareBusinessSummaryDraft(
  input: BusinessSummaryDraftInput,
): GenerateDraftTextRequest {
  const { reports } = input;
  const kpiLines = reports.kpis
    .map((kpi) => `${kpi.label}: ${kpi.value} (${kpi.comparison})`)
    .join("\n");

  const cash = reports.cashHealth;
  const context = trimAiText(
    [
      `Reporting period: ${reports.dateBounds.startDate} to ${reports.dateBounds.endDate}`,
      "",
      "Key metrics:",
      kpiLines,
      "",
      `Cash health — Paid: ${formatCurrency(cash.paid)}; Outstanding: ${formatCurrency(cash.outstanding)}; Overdue: ${formatCurrency(cash.overdue)}; Collection rate: ${cash.collectionRateLabel}`,
      `Sales funnel — ${formatFunnelSummary(reports)}`,
      formatTechnicianSummary(reports),
      "",
      `Accountant snapshot — Collected: ${formatCurrency(reports.accountantSummary.totalPaymentsCollected)}; Expenses: ${formatCurrency(reports.accountantSummary.expensesRecorded)}; Net estimate: ${formatCurrency(reports.accountantSummary.netIncomeEstimate)}`,
    ].join("\n"),
    4000,
  );

  return {
    feature: BUSINESS_SUMMARY_AI_FEATURE,
    prompt: BUSINESS_SUMMARY_PROMPT,
    inputText: context,
  };
}

export function parseBusinessSummaryDraft(draftText: string): {
  bullets: string[];
  recommendedAction: string;
} {
  const lines = draftText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const actionIndex = lines.findIndex((line) =>
    line.toLowerCase().startsWith("recommended next action:"),
  );

  const bulletLines =
    actionIndex >= 0 ? lines.slice(0, actionIndex) : lines.slice(0, 5);

  const bullets = bulletLines
    .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  const recommendedAction =
    actionIndex >= 0
      ? lines[actionIndex].replace(/^recommended next action:\s*/i, "").trim()
      : "Review the reporting period metrics and confirm next operational priorities.";

  return {
    bullets:
      bullets.length > 0
        ? bullets
        : ["Summary generated — review the metrics above for details."],
    recommendedAction,
  };
}
