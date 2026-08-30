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

  /*
   * The redirect must not run against the SERVER snapshot.
   *
   * `useStoredOwnerViewMode` returns "owner_admin" on the server (localStorage
   * does not exist there) and the real mode on the client. During hydration the
   * effect would therefore see "owner_admin" while the owner was actually in
   * technician mode, and bounce them off /tech/* back to the dashboard — the
   * "3 of 4 tabs return Home" behaviour. Waiting one commit lets the store
   * resolve to the client value before any navigation is decided.
   */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!isOwner || !hydrated) {
      return;
    }

    const redirectTarget = shouldRedirectForOwnerViewMode(pathname, viewMode);

    if (redirectTarget && redirectTarget !== pathname) {
      router.replace(redirectTarget);
    }
  }, [hydrated, isOwner, pathname, router, viewMode]);

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

  const redirectTarget = useMemo(
    () =>
      isOwner ? shouldRedirectForOwnerViewMode(pathname, viewMode) : null,
    [isOwner, pathname, viewMode],
  );

  const redirectPending = Boolean(
    redirectTarget && redirectTarget !== pathname,
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
    redirectPending,
    hydrated: true,
  };
}
