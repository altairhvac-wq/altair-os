"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
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

const ownerViewModeListeners = new Set<() => void>();

function subscribeOwnerViewMode(listener: () => void) {
  ownerViewModeListeners.add(listener);

  return () => {
    ownerViewModeListeners.delete(listener);
  };
}

function notifyOwnerViewModeListeners() {
  ownerViewModeListeners.forEach((listener) => listener());
}

function useStoredOwnerViewMode(
  companyId: string,
  isOwner: boolean,
): OwnerViewMode {
  return useSyncExternalStore(
    subscribeOwnerViewMode,
    () => (isOwner ? loadOwnerViewMode(companyId) : "owner_admin"),
    () => "owner_admin",
  );
}

export function useOwnerViewMode(companyContext: ActiveCompanyContext) {
  const router = useRouter();
  const pathname = usePathname();
  const companyId = companyContext.company.id;
  const isOwner = isOwnerViewModeEligible(companyContext.role);
  const storedViewMode = useStoredOwnerViewMode(companyId, isOwner);
  const [viewModeOverride, setViewModeOverride] = useState<OwnerViewMode | null>(
    null,
  );
  const viewMode = viewModeOverride ?? storedViewMode;

  useEffect(() => {
    setViewModeOverride(null);
  }, [companyId]);

  useEffect(() => {
    if (!isOwner) {
      return;
    }

    const redirectTarget = shouldRedirectForOwnerViewMode(pathname, viewMode);

    if (redirectTarget && redirectTarget !== pathname) {
      router.replace(redirectTarget);
    }
  }, [isOwner, pathname, router, viewMode]);

  const setViewMode = useCallback(
    (nextMode: OwnerViewMode) => {
      if (!isOwner || viewMode === nextMode) {
        return;
      }

      persistOwnerViewMode(companyId, nextMode);
      setViewModeOverride(nextMode);
      notifyOwnerViewModeListeners();
      router.push(OWNER_VIEW_MODE_LANDING[nextMode]);
    },
    [companyId, isOwner, router, viewMode],
  );

  const navigationContext = useMemo(
    () =>
      getNavigationContextForOwnerViewMode(
        companyContext,
        isOwner ? viewMode : "owner_admin",
      ),
    [companyContext, isOwner, viewMode],
  );

  return {
    isOwner,
    viewMode: isOwner ? viewMode : ("owner_admin" as const),
    setViewMode,
    navigationContext,
    hydrated: true,
  };
}
