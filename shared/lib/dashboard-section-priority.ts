import {
  buildDashboardNextBestActions,
  hasDashboardNextBestActions,
} from "@/shared/lib/dashboard-next-best-actions";
import { buildOfficePriorityRecommendations } from "@/shared/lib/office-priority-engine";
import type { DashboardData } from "@/shared/types/dashboard";

export type DashboardRoleFocus = "command" | "dispatch" | "office";

export type DashboardPrioritySectionId =
  | "needs-attention"
  | "todays-work"
  | "revenue-billing"
  | "operational-health"
  | "next-steps";

export const DASHBOARD_SECTION_LABELS: Record<
  DashboardPrioritySectionId,
  { title: string; description?: string }
> = {
  "needs-attention": {
    title: "Needs attention",
    description: "Priority signals and open queues",
  },
  "todays-work": { title: "Today's work" },
  "revenue-billing": { title: "Revenue and billing" },
  "operational-health": { title: "Operational health" },
  "next-steps": {
    title: "Next steps",
    description: "Action playbook and recent activity",
  },
};

/** Lower-priority bands collapsed by default to reduce scroll and visual competition. */
export const DASHBOARD_COLLAPSED_SECTIONS: ReadonlySet<DashboardPrioritySectionId> =
  new Set(["operational-health", "next-steps"]);

export function getDashboardRoleFocus(
  access: DashboardData["access"],
): DashboardRoleFocus {
  if (access.canViewBilling && access.canViewTechnicianRoster) {
    return "command";
  }
  if (access.canViewTechnicianRoster && !access.canViewBilling) {
    return "dispatch";
  }
  if (access.canViewBilling && !access.canViewTechnicianRoster) {
    return "office";
  }
  return "command";
}

/**
 * Action-first section order: needs-attention and today's work surface before
 * analytics-style health and activity bands.
 */
export function getDashboardSectionOrder(
  access: DashboardData["access"],
  roleFocus: DashboardRoleFocus,
): DashboardPrioritySectionId[] {
  if (!access.canViewOperationalReports) {
    const sections: DashboardPrioritySectionId[] = ["todays-work"];
    if (access.canViewBilling || access.canViewCompanyExpenses) {
      sections.push("revenue-billing");
    }
    sections.push("next-steps");
    return sections;
  }

  const tail: DashboardPrioritySectionId[] = [
    "operational-health",
    "next-steps",
  ];

  switch (roleFocus) {
    case "dispatch": {
      const sections: DashboardPrioritySectionId[] = [
        "needs-attention",
        "todays-work",
      ];
      if (access.canViewCompanyExpenses) {
        sections.push("revenue-billing");
      }
      return [...sections, ...tail];
    }
    case "office":
      return [
        "needs-attention",
        "todays-work",
        "revenue-billing",
        ...tail,
      ];
    default:
      return [
        "needs-attention",
        "todays-work",
        "revenue-billing",
        ...tail,
      ];
  }
}

export function getDashboardSectionSummaryHint(
  sectionId: DashboardPrioritySectionId,
  data: DashboardData,
): string | undefined {
  switch (sectionId) {
    case "operational-health":
      return `${data.operationalHealth.operationalHealthScore} · ${data.operationalHealth.operationalHealthLabel}`;
    case "next-steps": {
      const altairRecommendations = buildOfficePriorityRecommendations(data);
      const actions = buildDashboardNextBestActions(data);
      const additionalActions = actions.filter(
        (action) =>
          !altairRecommendations.some(
            (recommendation) => recommendation.relatedQueue === action.queueType,
          ),
      );
      const actionCount = additionalActions.length;
      const activityCount = data.recentActivity.length;

      if (actionCount > 0 && activityCount > 0) {
        return `${actionCount} action${actionCount === 1 ? "" : "s"} · ${activityCount} recent event${activityCount === 1 ? "" : "s"}`;
      }
      if (actionCount > 0) {
        return `${actionCount} additional action${actionCount === 1 ? "" : "s"}`;
      }
      if (activityCount > 0) {
        return `${activityCount} recent event${activityCount === 1 ? "" : "s"}`;
      }
      if (hasDashboardNextBestActions(data)) {
        return "Top priorities shown above";
      }
      return "All caught up";
    }
    default:
      return undefined;
  }
}
