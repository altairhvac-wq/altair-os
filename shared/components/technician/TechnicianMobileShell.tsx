import { Wrench } from "lucide-react";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { CompanySwitcher } from "@/shared/components/company/CompanySwitcher";
import { PullToRefresh } from "@/shared/components/mobile/PullToRefresh";
import { TechnicianBottomNav } from "./TechnicianBottomNav";
import { TechnicianNotificationBadgeProvider } from "@/shared/components/notifications/TechnicianNotificationBadgeContext";
import { TechnicianNotificationLink } from "@/shared/components/notifications/TechnicianNotificationLink";

type TechnicianMobileShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  unreadNotificationCount?: number;
};

export function TechnicianMobileShell({
  children,
  companyContext,
  userCompanies,
  unreadNotificationCount = 0,
}: TechnicianMobileShellProps) {
  return (
    <TechnicianNotificationBadgeProvider
      initialUnreadCount={unreadNotificationCount}
    >
      <div className="min-h-dvh max-w-full overflow-x-clip bg-slate-100">
        <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-md flex-col border-x border-slate-200 bg-slate-100 shadow-xl">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-600 text-white">
                <Wrench className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">Altair OS</p>
                <CompanySwitcher
                  activeCompanyId={companyContext.company.id}
                  companies={userCompanies}
                  variant="technician"
                />
              </div>
              <TechnicianNotificationLink />
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 pb-24 sm:px-4">
            <PullToRefresh>{children}</PullToRefresh>
          </main>

          <TechnicianBottomNav companyContext={companyContext} />
        </div>
      </div>
    </TechnicianNotificationBadgeProvider>
  );
}
