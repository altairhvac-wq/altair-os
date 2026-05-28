"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ActiveCompanyContext } from "@/lib/database/types";
import {
  getNavigationContextForOwnerViewMode,
  isOwnerViewModeEligible,
  OWNER_VIEW_MODE_LANDING,
  shouldRedirectForOwnerViewMode,
  type OwnerViewMode,
} from "@/shared/lib/owner-view-mode";
import {
  loadOwnerViewMode,
  persistOwnerViewMode,
} from "@/shared/lib/owner-view-mode-preferences";

export function useOwnerViewMode(companyContext: ActiveCompanyContext) {
  const router = useRouter();
  const pathname = usePathname();
  const companyId = companyContext.company.id;
  const isOwner = isOwnerViewModeEligible(companyContext.role);
  const [viewMode, setViewModeState] = useState<OwnerViewMode>("owner_admin");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (isOwner) {
      setViewModeState(loadOwnerViewMode(companyId));
    }

    setHydrated(true);
  }, [companyId, isOwner]);

  useEffect(() => {
    if (!hydrated || !isOwner) {
      return;
    }

    const redirectTarget = shouldRedirectForOwnerViewMode(pathname, viewMode);

    if (redirectTarget && redirectTarget !== pathname) {
      router.replace(redirectTarget);
    }
  }, [hydrated, isOwner, pathname, router, viewMode]);

  const setViewMode = useCallback(
    (nextMode: OwnerViewMode) => {
      if (!isOwner || nextMode === viewMode) {
        return;
      }

      persistOwnerViewMode(companyId, nextMode);
      setViewModeState(nextMode);
      router.push(OWNER_VIEW_MODE_LANDING[nextMode]);
    },
    [companyId, isOwner, router, viewMode],
  );

  const navigationContext = getNavigationContextForOwnerViewMode(
    companyContext,
    isOwner ? viewMode : "owner_admin",
  );

  return {
    isOwner,
    viewMode: isOwner ? viewMode : ("owner_admin" as const),
    setViewMode,
    navigationContext,
    hydrated,
  };
}
