import {
  buildDashboardAttentionCards,
  countDashboardAttentionIssues,
} from "@/shared/lib/dashboard-attention-cards";
import { buildOfficePriorityRecommendations } from "@/shared/lib/office-priority-engine";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";
import type {
  HeroHighlight,
  HeroInsight,
  HeroTone,
} from "@/shared/design-system/components/HeroHeader";

export type DashboardSignatureHeroContent = {
  eyebrow: string;
  title: string;
  description: string;
  highlights: HeroHighlight[];
  insight?: HeroInsight;
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

function mapImpactCategoryToTone(
  category: string,
): HeroTone {
  switch (category) {
    case "cash_collection":
      return "warning";
    case "revenue_capture":
      return "info";
    case "dispatch":
      return "danger";
    default:
      return "neutral";
  }
}

function buildDescription(data: DashboardData): string {
  const { operations } = data;
  const parts: string[] = [];

  if (operations.totalJobsToday === 0) {
    parts.push("No jobs scheduled today");
  } else {
    parts.push(
      `${operations.totalJobsToday} job${operations.totalJobsToday === 1 ? "" : "s"} scheduled today`,
    );
  }

  if (operations.unassignedToday > 0) {
    parts.push(
      `${operations.unassignedToday} unassigned`,
    );
  } else if (operations.inProgress > 0 || operations.dispatched > 0) {
    parts.push(
      `${operations.inProgress + operations.dispatched} in motion`,
    );
  }

  return parts.join(" · ");
}

/**
 * Builds real-data hero content for the dashboard signature band.
 * No fake AI — insight slot only when office priority recommendations exist.
 */
export function buildDashboardSignatureHeroContent(
  data: DashboardData,
  options?: { maxHighlights?: number },
): DashboardSignatureHeroContent {
  const maxHighlights = options?.maxHighlights ?? 4;
  const { access, operations, money, operationalHealth } = data;
  const highlights: HeroHighlight[] = [];

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

    highlights.push({
      label: "Health score",
      value: String(operationalHealth.operationalHealthScore),
      tone: mapHealthTone(operationalHealth.operationalHealthScore),
    });
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

    highlights.push({
      label: "Completed",
      value: String(operations.completedToday),
      tone: "neutral",
    });
  }

  if (access.canViewBilling) {
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

  const recommendations = buildOfficePriorityRecommendations(data);
  const topRecommendation = recommendations[0];
  const insight: HeroInsight | undefined = topRecommendation
    ? {
        label: "Top priority",
        text: topRecommendation.title,
        tone: mapImpactCategoryToTone(topRecommendation.impactCategory),
      }
    : undefined;

  return {
    eyebrow: "Operations",
    title: "Business command center",
    description: buildDescription(data),
    highlights: highlights.slice(0, maxHighlights),
    insight,
  };
}
