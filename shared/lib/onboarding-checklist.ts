import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import { canAccessAppRedirectPath } from "@/lib/database/access-control";
import type {
  OnboardingChecklist,
  OnboardingChecklistItem,
  OnboardingSnapshot,
} from "@/shared/types/onboarding";

export function buildOnboardingChecklist(
  snapshot: OnboardingSnapshot,
): OnboardingChecklist {
  const items: OnboardingChecklistItem[] = [
    {
      id: "invite-team",
      title: "Invite your team",
      description:
        "Add technicians, dispatchers, or office staff so everyone can log in.",
      href: "/settings#team-members",
      completed: snapshot.hasInvitedOrActiveTeam,
      tip: "Invites appear as pending until the teammate signs up with the same email.",
    },
    {
      id: "add-customer",
      title: "Add your first customer",
      description:
        "Customers anchor jobs, estimates, invoices, and service history.",
      href: "/customers",
      completed: snapshot.customerCount > 0,
      tip: "Start with one active customer you dispatch for this week.",
    },
    {
      id: "create-job",
      title: "Schedule your first job",
      description:
        "Create a job to unlock dispatch, technician workflows, and completion tracking.",
      href: "/jobs",
      completed: snapshot.jobCount > 0,
      tip: "Even a test job helps your crew learn the mobile flow.",
    },
    {
      id: "setup-price-book",
      title: "Build your price book",
      description:
        "Add service items so estimates and invoices stay consistent.",
      href: "/price-book",
      completed: snapshot.serviceItemCount > 0,
      tip: "Add 3–5 common services to speed up billing later.",
    },
  ];

  const completedCount = items.filter((item) => item.completed).length;

  return {
    items,
    completedCount,
    totalCount: items.length,
    isComplete: completedCount === items.length,
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
  const completedCount = items.filter((item) => item.completed).length;

  return {
    items,
    completedCount,
    totalCount: items.length,
    isComplete: checklist.isComplete,
  };
}
