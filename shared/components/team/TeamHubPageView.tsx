"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";
import { TechniciansPageView } from "@/shared/components/technicians/TechniciansPageView";
import { TimeClockFoundationView } from "@/shared/components/time-clock/TimeClockFoundationView";
import { TeamHubTabs } from "@/shared/components/team/TeamHubTabs";
import { Button } from "@/shared/design-system/components";
import { MasterListPageLayout } from "@/shared/design-system/shell";
import type {
  TechnicianRosterRow,
  TechnicianTimeStatusCounts,
} from "@/shared/lib/technicians/technician-roster-time-status";
import {
  resolveTeamHubTab,
  TEAM_HUB_DEFAULT_TAB,
  type TeamHubTabId,
} from "@/shared/lib/team/team-hub";
import type { ReportTimeTrackingSummary } from "@/shared/types/reports-page";
import type { TimeClockEntry } from "@/shared/types/time-clock";
import type { TimeEntry } from "@/shared/types/time-entry";

type TeamHubPageViewProps = {
  canTechnicians: boolean;
  canTimeClock: boolean;
  canManagePermissions: boolean;
  technicians: TechnicianRosterRow[];
  technicianStatusCounts: TechnicianTimeStatusCounts;
  techniciansLoadError?: string;
  initialOpenEntry: TimeClockEntry | null;
  initialEntries: TimeClockEntry[];
  activeEntries: TimeEntry[];
  timeClockStatusCounts: TechnicianTimeStatusCounts;
  timeTracking: ReportTimeTrackingSummary;
  showRosterCounts: boolean;
  currentUserId: string;
  currentUserName: string;
  canViewCompanyEntries: boolean;
  canCorrectEntries: boolean;
};

function hubSubtitle(tab: TeamHubTabId): string {
  switch (tab) {
    case "time-clock":
      return "Shift history, live crew status, and missed clock-out corrections.";
    case "technicians":
    default:
      return "Field roster, live time-clock status, and share codes.";
  }
}

export function TeamHubPageView({
  canTechnicians,
  canTimeClock,
  canManagePermissions,
  technicians,
  technicianStatusCounts,
  techniciansLoadError,
  initialOpenEntry,
  initialEntries,
  activeEntries,
  timeClockStatusCounts,
  timeTracking,
  showRosterCounts,
  currentUserId,
  currentUserName,
  canViewCompanyEntries,
  canCorrectEntries,
}: TeamHubPageViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const availableTabs = useMemo(() => {
    const tabs: TeamHubTabId[] = [];
    if (canTechnicians) tabs.push("technicians");
    if (canTimeClock) tabs.push("time-clock");
    return tabs;
  }, [canTechnicians, canTimeClock]);

  const activeTab = resolveTeamHubTab(searchParams.get("tab"), {
    canTechnicians,
    canTimeClock,
  });

  const syncTabToUrl = useCallback(
    (tab: TeamHubTabId) => {
      const params = new URLSearchParams(searchParams.toString());

      if (tab === TEAM_HUB_DEFAULT_TAB) {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return (
    <MasterListPageLayout
      title="Team"
      subtitle={hubSubtitle(activeTab)}
      density="compact"
      headerSurfaceVariant="default"
      headerTitleClassName="min-w-0 text-base font-semibold tracking-tight text-altair-ink-on-paper sm:text-lg"
      headerSubtitleClassName="min-w-0 truncate text-[11px] leading-snug text-altair-ink-on-paper-muted"
      headerClassName="py-1.5"
      headerCenter={
        <TeamHubTabs
          activeTab={activeTab}
          availableTabs={availableTabs}
          onTabChange={syncTabToUrl}
        />
      }
      secondaryAction={
        canManagePermissions ? (
          <Button
            href="/settings/team"
            size="sm"
            variant="secondary"
            leadingIcon={<Shield className="h-3.5 w-3.5" />}
          >
            <span className="hidden sm:inline">Manage permissions</span>
            <span className="sm:hidden">Permissions</span>
          </Button>
        ) : undefined
      }
    >
      {activeTab === "technicians" && canTechnicians ? (
        <TechniciansPageView
          technicians={technicians}
          statusCounts={technicianStatusCounts}
          loadError={techniciansLoadError}
          embedded
        />
      ) : null}

      {activeTab === "time-clock" && canTimeClock ? (
        <TimeClockFoundationView
          initialOpenEntry={initialOpenEntry}
          initialEntries={initialEntries}
          activeEntries={activeEntries}
          statusCounts={timeClockStatusCounts}
          timeTracking={timeTracking}
          showRosterCounts={showRosterCounts}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          canViewCompanyEntries={canViewCompanyEntries}
          canCorrectEntries={canCorrectEntries}
          embedded
        />
      ) : null}
    </MasterListPageLayout>
  );
}
