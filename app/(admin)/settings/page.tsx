import {
  Building2,
  CreditCard,
  FileText,
  ReceiptText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  canAccessSystemCheck,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getOnboardingSnapshot } from "@/lib/database/queries/onboarding-snapshot";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { buildOnboardingChecklist, filterOnboardingChecklistForContext } from "@/shared/lib/onboarding-checklist";
import { OnboardingChecklistSection } from "@/shared/components/onboarding/OnboardingChecklistSection";
import {
  SettingsDestinationList,
  SettingsWorkspacePage,
  SettingsWorkspaceSection,
  type SettingsDestination,
} from "@/shared/components/settings/SettingsWorkspacePage";
import type { OnboardingSnapshot } from "@/shared/types/onboarding";

const EMPTY_ONBOARDING_SNAPSHOT: OnboardingSnapshot = {
  teamMemberCount: 0,
  hasInvitedOrActiveTeam: false,
  customerCount: 0,
  leadCount: 0,
  jobCount: 0,
  serviceItemCount: 0,
  estimateCount: 0,
  invoiceCount: 0,
  hasBillingDefaultsConfigured: false,
};

async function loadOnboardingSnapshotSafely(
  companyId: string,
  companyContext: NonNullable<Awaited<ReturnType<typeof getActiveCompanyContext>>>,
): Promise<OnboardingSnapshot> {
  try {
    return await getOnboardingSnapshot(companyId, companyContext);
  } catch (error) {
    console.error("[SettingsOverviewPage] onboarding snapshot load failed:", error);
    return EMPTY_ONBOARDING_SNAPSHOT;
  }
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payments?: string }>;
}) {
  const companyContext = await getActiveCompanyContext();
  const params = await searchParams;

  if (!companyContext) {
    return null;
  }

  if (params.payments === "return" || params.payments === "refresh") {
    redirect(`/settings/payments?payments=${params.payments}`);
  }

  const onboardingSnapshot = await loadOnboardingSnapshotSafely(
    companyContext.company.id,
    companyContext,
  );
  const onboardingChecklist = filterOnboardingChecklistForContext(
    buildOnboardingChecklist(onboardingSnapshot),
    companyContext,
  );
  const northStar = isNorthStarShellEnabled();
  const destinations: SettingsDestination[] = [
    {
      title: "Company",
      description: "Business information and branding.",
      href: "/settings/company",
      icon: Building2,
    },
    {
      title: "Team",
      description: "Members, invitations, and permissions.",
      href: "/settings/team",
      icon: Users,
    },
    {
      title: "Documents",
      description: "Invoices and estimate defaults.",
      href: "/settings/documents",
      icon: FileText,
    },
    {
      title: "Altair Subscription",
      description: "Manage your Altair plan and billing.",
      href: "/settings/subscription",
      icon: ReceiptText,
    },
    {
      title: "Customer Payments",
      description: "Stripe Connect and customer payment collection.",
      href: "/settings/payments",
      icon: CreditCard,
    },
  ];

  if (canAccessSystemCheck(companyContext)) {
    destinations.push({
      title: "System Check",
      description: "Workspace diagnostics and production readiness.",
      href: "/settings/system-check",
      icon: ShieldCheck,
      status: "Owner only",
    });
  }

  return (
    <SettingsWorkspacePage
      title="Settings"
      description="Manage every aspect of your company."
      northStar={northStar}
    >
      <OnboardingChecklistSection
        checklist={onboardingChecklist}
        companyId={companyContext.company.id}
        userId={companyContext.user.id}
        variant="settings"
        northStar={northStar}
      />

      <SettingsWorkspaceSection
        title="Settings categories"
        description="Choose a category to review or update its configuration."
        northStar={northStar}
      >
        <SettingsDestinationList
          destinations={destinations}
          northStar={northStar}
        />
      </SettingsWorkspaceSection>
    </SettingsWorkspacePage>
  );
}
