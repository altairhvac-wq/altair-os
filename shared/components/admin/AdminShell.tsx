"use client";

import { usePathname } from "next/navigation";
import type { ActiveCompanyContext, MembershipWithCompany } from "@/lib/database/types";
import { PullToRefresh } from "@/shared/components/mobile/PullToRefresh";
import { isPullToRefreshRoute } from "@/shared/components/mobile/is-pull-to-refresh-route";
import { useMobileViewport } from "@/shared/components/mobile/use-mobile-viewport";
import { getNavItemForPath } from "./nav-items";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { Notification } from "@/shared/types/notification";

type AdminShellProps = {
  children: React.ReactNode;
  companyContext: ActiveCompanyContext;
  userCompanies: MembershipWithCompany[];
  notifications?: Notification[];
  unreadNotificationCount?: number;
};

export function AdminShell({
  children,
  companyContext,
  userCompanies,
  notifications = [],
  unreadNotificationCount = 0,
}: AdminShellProps) {
  const pathname = usePathname();
  const isMobile = useMobileViewport();
  const pullToRefreshEnabled =
    isMobile && isPullToRefreshRoute(pathname);
  const current = getNavItemForPath(pathname, companyContext);

  return (
    <div className="admin-canvas flex min-h-dvh w-full min-w-0 max-w-full md:h-dvh md:overflow-hidden">
      <Sidebar className="hidden md:flex" companyContext={companyContext} />

      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col">
        <Header
          title={current.label}
          description={current.description}
          companyContext={companyContext}
          userCompanies={userCompanies}
          notifications={notifications}
          unreadNotificationCount={unreadNotificationCount}
        />

        <MobileNav companyContext={companyContext} />

        <main className="min-h-0 min-w-0 max-w-full flex-1 overflow-x-clip p-4 sm:p-6 lg:p-8 md:overflow-y-auto">
          <PullToRefresh enabled={pullToRefreshEnabled}>
            {children}
          </PullToRefresh>
        </main>
      </div>
    </div>
  );
}
