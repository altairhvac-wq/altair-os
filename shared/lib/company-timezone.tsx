"use client";

import { createContext, useContext, useLayoutEffect } from "react";
import {
  DEFAULT_COMPANY_TIMEZONE,
  setCompanyTimeZone,
} from "@/shared/lib/datetime";

const CompanyTimezoneContext = createContext<string>(DEFAULT_COMPANY_TIMEZONE);

type CompanyTimezoneProviderProps = {
  timeZone: string;
  children: React.ReactNode;
};

export function CompanyTimezoneProvider({
  timeZone,
  children,
}: CompanyTimezoneProviderProps) {
  const resolvedTimeZone = timeZone || DEFAULT_COMPANY_TIMEZONE;

  useLayoutEffect(() => {
    setCompanyTimeZone(resolvedTimeZone);
  }, [resolvedTimeZone]);

  setCompanyTimeZone(resolvedTimeZone);

  return (
    <CompanyTimezoneContext.Provider value={resolvedTimeZone}>
      {children}
    </CompanyTimezoneContext.Provider>
  );
}

export function useCompanyTimezone(): string {
  return useContext(CompanyTimezoneContext);
}
