"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { formatDemoDisplayName } from "@/shared/lib/demo-display-name";

type FounderMarketingDisplayContextValue = {
  hideDemoPrefixes: boolean;
};

const FounderMarketingDisplayContext =
  createContext<FounderMarketingDisplayContextValue>({
    hideDemoPrefixes: false,
  });

type FounderMarketingDisplayProviderProps = {
  hideDemoPrefixes: boolean;
  children: ReactNode;
};

export function FounderMarketingDisplayProvider({
  hideDemoPrefixes,
  children,
}: FounderMarketingDisplayProviderProps) {
  const value = useMemo(() => ({ hideDemoPrefixes }), [hideDemoPrefixes]);

  return (
    <FounderMarketingDisplayContext.Provider value={value}>
      {children}
    </FounderMarketingDisplayContext.Provider>
  );
}

export function useHideDemoPrefixes(): boolean {
  return useContext(FounderMarketingDisplayContext).hideDemoPrefixes;
}

export function useFormatDemoDisplayName() {
  const hideDemoPrefixes = useHideDemoPrefixes();

  return useMemo(
    () => (value: string | null | undefined) =>
      formatDemoDisplayName(value, hideDemoPrefixes),
    [hideDemoPrefixes],
  );
}
