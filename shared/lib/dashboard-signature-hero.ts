import {
  buildDashboardAttentionCards,
  countDashboardAttentionIssues,
} from "@/shared/lib/dashboard-attention-cards";
import type {
  HeroHighlight,
  HeroTone,
} from "@/shared/design-system/components/HeroHeader";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";

export type DashboardSignatureHeroContent = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: HeroHighlight[];
};

function mapHealthTone(score: number): HeroTone {
  if (score >= 75) {
    return "success";
  }
  if (score >= 50) {
    return "warning";
  }
  return "danger";
}

function mapAttentionTone(data: DashboardData, issueCount: number): HeroTone {
  if (issueCount === 0) {
    return "neutral";
  }

  const hasCritical = buildDashboardAttentionCards(data).some(
    (card) => card.severity === "critical",
  );
  return hasCritical ? "danger" : "warning";
}

function buildOperatingPictureSentence(data: DashboardData): string {
  const { operations, money, access } = data;
  const inMotion = operations.dispatched + operations.inProgress;

  if (operations.totalJobsToday === 0) {
    if (access.canViewBilling && money.overdueCount > 0) {
      return `${money.overdueCount} overdue invoice${money.overdueCount === 1 ? "" : "s"} need collection — no field work scheduled today.`;
    }
    return "No jobs scheduled today — field capacity is open.";
  }

  if (operations.unassignedToday > 0 && inMotion === 0) {
    return `${operations.unassignedToday} of ${operations.totalJobsToday} scheduled job${operations.totalJobsToday === 1 ? "" : "s"} still need assignment before the day moves.`;
  }

  if (operations.unassignedToday > 0) {
    return `${inMotion} job${inMotion === 1 ? "" : "s"} in motion with ${operations.unassignedToday} still unassigned on today's board.`;
  }

  if (inMotion > 0) {
    return `${inMotion} of ${operations.totalJobsToday} scheduled job${operations.totalJobsToday === 1 ? "" : "s"} in motion — board is covered.`;
  }

  return `${operations.totalJobsToday} job${operations.totalJobsToday === 1 ? "" : "s"} scheduled today, awaiting dispatch.`;
}

/**
 * Builds real-data editorial content for the dashboard operations cockpit.
 */
export function buildDashboardSignatureHeroContent(
  data: DashboardData,
  options?: { maxHighlights?: number },
): DashboardSignatureHeroContent {
  const maxHighlights = options?.maxHighlights ?? 4;
  const { access, operations, money, operationalHealth } = data;
  const highlights: HeroHighlight[] = [];

  if (maxHighlights > 0) {
    highlights.push({
      label: "Jobs today",
      value: String(operations.totalJobsToday),
      tone:
        operations.unassignedToday >= 3
          ? "danger"
          : operations.unassignedToday > 0
            ? "warning"
            : "neutral",
    });

    if (access.canViewOperationalReports) {
      const issueCount = countDashboardAttentionIssues(
        buildDashboardAttentionCards(data),
      );
      highlights.push({
        label: "Needs attention",
        value: String(issueCount),
        tone: mapAttentionTone(data, issueCount),
      });

      if (maxHighlights > 2) {
        highlights.push({
          label: "Health score",
          value: String(operationalHealth.operationalHealthScore),
          tone: mapHealthTone(operationalHealth.operationalHealthScore),
        });
      }
    } else {
      highlights.push({
        label: "Unassigned",
        value: String(operations.unassignedToday),
        tone:
          operations.unassignedToday === 0
            ? "success"
            : operations.unassignedToday >= 3
              ? "danger"
              : "warning",
      });

      if (maxHighlights > 2) {
        highlights.push({
          label: "Completed",
          value: String(operations.completedToday),
          tone: "neutral",
        });
      }
    }

    if (access.canViewBilling && maxHighlights > 2) {
      highlights.push({
        label: "Overdue",
        value:
          money.overdueCount === 0
            ? "None"
            : `${money.overdueCount} · ${formatCurrency(money.overdueTotal)}`,
        tone:
          money.overdueCount === 0
            ? "success"
            : money.overdueCount >= 3
              ? "danger"
              : "warning",
      });
    }
  }

  return {
    eyebrow: "Operations cockpit",
    title: "Today's operating picture",
    description: buildOperatingPictureSentence(data),
    highlights: highlights.slice(0, maxHighlights),
  };
}
