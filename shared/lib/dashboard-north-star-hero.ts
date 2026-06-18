import { buildDashboardSignatureHeroContent } from "@/shared/lib/dashboard-signature-hero";
import {
  buildOfficePriorityRecommendations,
  type OfficePriorityImpactCategory,
  type OfficePriorityRecommendation,
} from "@/shared/lib/office-priority-engine";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";

export type NorthStarSignalChip = {
  label: string;
  value: string;
};

export type NorthStarHeroInsight = {
  title: string;
  detail: string;
};

export type NorthStarHeroContent = {
  title: string;
  operatingMessage: string;
  opsScore: number;
  signalChips: NorthStarSignalChip[];
  insight: NorthStarHeroInsight | null;
  primary: OfficePriorityRecommendation | null;
  secondary: OfficePriorityRecommendation[];
  isOperationsClear: boolean;
};

const IMPACT_CATEGORY_LABELS: Record<OfficePriorityImpactCategory, string> = {
  cash_collection: "Cash collection",
  revenue_capture: "Revenue capture",
  dispatch: "Dispatch",
  office_review: "Office review",
};

export function formatNorthStarImpactCategoryLabel(
  category: OfficePriorityImpactCategory,
): string {
  return IMPACT_CATEGORY_LABELS[category];
}

export function formatNorthStarRecommendationMetric(
  recommendation: OfficePriorityRecommendation,
): string | null {
  if (
    recommendation.monetaryImpact != null &&
    recommendation.monetaryImpact > 0
  ) {
    return formatCurrency(recommendation.monetaryImpact);
  }

  if (recommendation.count > 0) {
    return `${recommendation.count} item${recommendation.count === 1 ? "" : "s"}`;
  }

  return null;
}

function buildInsight(data: DashboardData): NorthStarHeroInsight | null {
  const { operationalHealth, operationalInsights } = data;
  const highlight = operationalInsights.highlights[0];

  if (highlight) {
    return {
      title: highlight.message,
      detail: "From today's operational intelligence scan.",
    };
  }

  if (operationalHealth.operationalHealthScore >= 75) {
    return {
      title: `Strongest area: ${operationalHealth.strongestOperationalArea.label}`,
      detail: `${operationalHealth.operationalHealthLabel} — score ${operationalHealth.operationalHealthScore}.`,
    };
  }

  if (operationalHealth.biggestOperationalRisk.score < 100) {
    return {
      title: `Watch: ${operationalHealth.biggestOperationalRisk.label}`,
      detail: `${operationalHealth.operationalHealthLabel} — score ${operationalHealth.operationalHealthScore}.`,
    };
  }

  return null;
}

/**
 * Maps existing production dashboard data into North Star command hero content.
 * Reuses signature hero copy, priority engine rankings, and health score — no new scoring.
 */
export function buildNorthStarHeroContent(data: DashboardData): NorthStarHeroContent {
  const heroContent = buildDashboardSignatureHeroContent(data, {
    maxHighlights: 4,
  });
  const recommendations = buildOfficePriorityRecommendations(data);
  const primary = recommendations[0] ?? null;
  const secondary = recommendations.slice(1, 3);

  return {
    title: heroContent.title,
    operatingMessage: heroContent.description,
    opsScore: data.operationalHealth.operationalHealthScore,
    signalChips: heroContent.highlights.map((highlight) => ({
      label: highlight.label,
      value: highlight.value,
    })),
    insight: buildInsight(data),
    primary,
    secondary,
    isOperationsClear: primary === null,
  };
}
