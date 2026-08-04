"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Upload, UserPlus } from "lucide-react";
import type { LeadAssignableMember } from "@/lib/database/queries/leads";
import { Button } from "@/shared/design-system/components";
import { MasterListPageLayout } from "@/shared/design-system/shell";
import { CustomersHubTabs } from "@/shared/components/customers/CustomersHubTabs";
import { CustomersPageView } from "@/shared/components/customers/CustomersPageView";
import { isLeadListFilter } from "@/shared/components/leads/lead-work-queues";
import { LeadsPageView } from "@/shared/components/leads/LeadsPageView";
import {
  resolveCustomersHubTab,
  type CustomersHubTabId,
} from "@/shared/lib/customers/customers-hub";
import type { Customer } from "@/shared/types/customer";
import type { Lead, LeadStatus } from "@/shared/types/lead";
import type { LeadActivity } from "@/shared/types/lead-activity";

const LEAD_STATUS_FILTERS = new Set<LeadStatus>([
  "new",
  "contacted",
  "scheduled",
  "estimate_sent",
  "won",
  "lost",
]);

type CustomersHubPageViewProps = {
  initialCustomers: Customer[];
  canManageCustomers: boolean;
  initialLeads: Lead[];
  activitiesByLeadId: Record<string, LeadActivity[]>;
  assignableMembers: LeadAssignableMember[];
  aiFeaturesEnabled: boolean;
  aiDraftingConfigured: boolean;
  initialTab?: string;
  initialSelectedLeadId?: string;
  initialCreateLead?: boolean;
  initialLeadStatusFilter?: string;
  initialLeadFollowUpDue?: boolean;
  initialLeadListFilter?: string;
  /** Customers book work-queue deep link (?queue=needs-info). */
  initialCustomerWorkQueue?: string;
};

function hubSubtitle(tab: CustomersHubTabId): string {
  switch (tab) {
    case "pipeline":
      return "Contact, qualify, and convert new opportunities.";
    case "archived":
      return "Archived and recently deleted customers.";
    case "customers":
    default:
      return "Find who you need. See what needs attention.";
  }
}

export function CustomersHubPageView({
  initialCustomers,
  canManageCustomers,
  initialLeads,
  activitiesByLeadId,
  assignableMembers,
  aiFeaturesEnabled,
  aiDraftingConfigured,
  initialSelectedLeadId,
  initialCreateLead = false,
  initialLeadStatusFilter,
  initialLeadFollowUpDue = false,
  initialLeadListFilter,
  initialCustomerWorkQueue,
}: CustomersHubPageViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveCustomersHubTab(searchParams.get("tab"));
  const customerCreateHandlerRef = useRef<(() => void) | null>(null);
  const leadCreateHandlerRef = useRef<(() => void) | null>(null);

  const syncTabToUrl = useCallback(
    (tab: CustomersHubTabId) => {
      const params = new URLSearchParams(searchParams.toString());

      if (tab === "customers") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }

      // Queue means different things on book vs pipeline — clear on tab change.
      params.delete("queue");

      if (tab !== "pipeline") {
        params.delete("selected");
        params.delete("create");
        params.delete("status");
        params.delete("filter");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  function handleTabChange(tab: CustomersHubTabId) {
    syncTabToUrl(tab);
  }

  const registerCustomerCreateHandler = useCallback((handler: () => void) => {
    customerCreateHandlerRef.current = handler;
  }, []);

  const registerLeadCreateHandler = useCallback((handler: () => void) => {
    leadCreateHandlerRef.current = handler;
  }, []);

  const leadStatusFilter =
    initialLeadStatusFilter &&
    LEAD_STATUS_FILTERS.has(initialLeadStatusFilter as LeadStatus)
      ? (initialLeadStatusFilter as LeadStatus)
      : undefined;
  const leadListFilter =
    initialLeadListFilter && isLeadListFilter(initialLeadListFilter)
      ? initialLeadListFilter
      : undefined;

  const primaryAction =
    activeTab === "customers" && canManageCustomers ? (
      <Button
        size="sm"
        onClick={() => customerCreateHandlerRef.current?.()}
        leadingIcon={<UserPlus className="h-3.5 w-3.5" />}
      >
        New Customer
      </Button>
    ) : activeTab === "pipeline" ? (
      <Button
        size="sm"
        onClick={() => leadCreateHandlerRef.current?.()}
        leadingIcon={<Plus className="h-3.5 w-3.5" />}
      >
        New Lead
      </Button>
    ) : undefined;

  const secondaryAction =
    activeTab === "customers" && canManageCustomers ? (
      <Button
        href="/customers/import"
        size="sm"
        variant="secondary"
        leadingIcon={<Upload className="h-3.5 w-3.5" />}
      >
        <span className="hidden sm:inline">Import Customers</span>
        <span className="sm:hidden">Import</span>
      </Button>
    ) : undefined;

  return (
    <MasterListPageLayout
      title="Customers"
      subtitle={hubSubtitle(activeTab)}
      density="compact"
      headerSurfaceVariant="default"
      headerTitleClassName="min-w-0 text-base font-semibold tracking-tight text-altair-ink-on-paper sm:text-lg"
      headerSubtitleClassName="min-w-0 truncate text-[11px] leading-snug text-altair-ink-on-paper-muted"
      headerClassName="py-1.5"
      headerCenter={
        <CustomersHubTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      }
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
    >
      {activeTab === "customers" ? (
        <CustomersPageView
          initialCustomers={initialCustomers}
          canManageCustomers={canManageCustomers}
          embedded
          lifecycleScope="book"
          initialWorkQueue={initialCustomerWorkQueue}
          onRegisterCreateHandler={registerCustomerCreateHandler}
        />
      ) : null}

      {activeTab === "archived" ? (
        <CustomersPageView
          initialCustomers={initialCustomers}
          canManageCustomers={canManageCustomers}
          embedded
          lifecycleScope="archived"
        />
      ) : null}

      {activeTab === "pipeline" ? (
        <LeadsPageView
          initialLeads={initialLeads}
          activitiesByLeadId={activitiesByLeadId}
          assignableMembers={assignableMembers}
          aiFeaturesEnabled={aiFeaturesEnabled}
          aiDraftingConfigured={aiDraftingConfigured}
          initialSelectedId={initialSelectedLeadId}
          initialCreate={initialCreateLead}
          initialStatusFilter={leadStatusFilter}
          initialFollowUpDue={initialLeadFollowUpDue}
          initialListFilter={leadListFilter}
          embedded
          onRegisterCreateHandler={registerLeadCreateHandler}
        />
      ) : null}
    </MasterListPageLayout>
  );
}
