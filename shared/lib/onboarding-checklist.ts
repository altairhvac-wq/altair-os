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
      id: "workspace-ready",
      title: "Create workspace",
      description: "Your company workspace is live — Altair is ready to guide the rest.",
      href: "/",
      completed: true,
    },
    {
      id: "add-customer",
      title: "Add your first customer",
      description:
        "Start here — customers unlock jobs, estimates, and service history.",
      href: "/customers",
      completed: snapshot.customerCount > 0,
      tip: "Use a real account you dispatch for this week.",
    },
    {
      id: "invite-team",
      title: "Invite your team",
      description:
        "Add technicians or office staff when you are ready — optional if you run solo.",
      href: "/settings#team-members",
      completed: snapshot.hasInvitedOrActiveTeam,
      optional: true,
      tip: "Invites stay pending until the teammate signs up with the same email.",
    },
    {
      id: "create-job",
      title: "Schedule your first job",
      description:
        "Put work on the board, then estimate and invoice from that job.",
      href: "/jobs",
      completed: snapshot.jobCount > 0,
      tip: "A simple job is enough to walk dispatch and the money path.",
    },
    {
      id: "setup-price-book",
      title: "Build your price book",
      description:
        "Add common services so estimates and invoices use consistent pricing.",
      href: "/price-book",
      completed: snapshot.serviceItemCount > 0,
      tip: "Three to five frequent services is a good starting set.",
    },
    {
      id: "add-lead",
      title: "Add your first lead",
      description:
        "Track prospects in the Lead Pipeline before they become customers.",
      href: "/leads",
      completed: snapshot.leadCount > 0,
      optional: true,
      tip: "Leads stay separate until you convert or send an estimate.",
    },
    {
      id: "money-path",
      title: "Create your first invoice",
      description:
        "Send an estimate, turn it into an invoice, and record a payment.",
      href: "/invoices",
      completed: snapshot.estimateCount > 0 && snapshot.invoiceCount > 0,
      optional: true,
      tip: "Open any job to create an estimate, then invoice when ready.",
    },
    {
      id: "billing-defaults",
      title: "Review billing defaults",
      description:
        "Set tax rate, payment terms, and default notes once.",
      href: "/settings#billing-defaults",
      completed: snapshot.hasBillingDefaultsConfigured,
      optional: true,
      tip: "Defaults apply automatically on new billing documents.",
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
