import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import { canAccessAppRedirectPath } from "@/lib/database/access-control";
import type {
  OnboardingChecklist,
  OnboardingChecklistItem,
  OnboardingSnapshot,
} from "@/shared/types/onboarding";

function getRequiredItems(items: OnboardingChecklistItem[]): OnboardingChecklistItem[] {
  return items.filter((item) => !item.optional);
}

function buildChecklistMetrics(items: OnboardingChecklistItem[]): Pick<
  OnboardingChecklist,
  "completedCount" | "totalCount" | "isComplete"
> {
  const requiredItems = getRequiredItems(items);
  const completedCount = requiredItems.filter((item) => item.completed).length;

  return {
    completedCount,
    totalCount: requiredItems.length,
    isComplete:
      requiredItems.length > 0 && completedCount === requiredItems.length,
  };
}

export function buildOnboardingChecklist(
  snapshot: OnboardingSnapshot,
): OnboardingChecklist {
  const items: OnboardingChecklistItem[] = [
    {
      id: "add-customer",
      title: "Add your first customer",
      description:
        "Start here — customers are required before you can schedule jobs or send estimates.",
      href: "/customers",
      completed: snapshot.customerCount > 0,
      tip: "Use a real account you dispatch for this week.",
    },
    {
      id: "create-job",
      title: "Schedule your first job",
      description:
        "Create a job to put work on the board and test dispatch plus technician workflows.",
      href: "/jobs",
      completed: snapshot.jobCount > 0,
      tip: "A simple test job is enough to walk through the mobile flow.",
    },
    {
      id: "setup-price-book",
      title: "Build your price book",
      description:
        "Add common services and parts so estimates and invoices pull consistent line items.",
      href: "/price-book",
      completed: snapshot.serviceItemCount > 0,
      tip: "Three to five frequent services is a good starting set.",
    },
    {
      id: "billing-defaults",
      title: "Review billing defaults",
      description:
        "Set tax rate, payment terms, and default notes before your first estimate or invoice.",
      href: "/settings#billing-defaults",
      completed: snapshot.hasBillingDefaultsConfigured,
      optional: true,
      tip: "Defaults apply automatically when new billing documents are created.",
    },
    {
      id: "invite-team",
      title: "Invite your team",
      description:
        "Add technicians, dispatchers, or office staff when you are ready — you can run solo for now.",
      href: "/settings#team-members",
      completed: snapshot.hasInvitedOrActiveTeam,
      optional: true,
      tip: "Invites stay pending until the teammate signs up with the same email.",
    },
  ];

  return {
    items,
    ...buildChecklistMetrics(items),
  };
}

export function shouldShowOnboardingChecklist(
  checklist: OnboardingChecklist,
): boolean {
  return checklist.items.length > 0 && !checklist.isComplete;
}

export function filterOnboardingChecklistForContext(
  checklist: OnboardingChecklist,
  context: ActiveCompanyContext,
): OnboardingChecklist {
  const items = checklist.items.filter((item) => {
    if (item.completed) {
      return true;
    }

    return canAccessAppRedirectPath(context, item.href);
  });

  return {
    items,
    ...buildChecklistMetrics(items),
  };
}
