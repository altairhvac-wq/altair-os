"use client";

import { createContext, useContext, useLayoutEffect } from "react";
import {
  DEFAULT_COMPANY_TIMEZONE,
  setCompanyTimeZone,
} from "@/shared/lib/datetime";

const CompanyTimezoneContext = createContext<string>(DEFAULT_COMPANY_TIMEZONE);

type CompanyTimezoneProviderProps = {
  /**
   * The company's time zone as the company context resolved it
   * (`companyContext.company.timezone`). It is used as it is: the one place
   * that decides what a stored zone means is resolveCompanyTimeZone, on the
   * server, where the whole row is in hand.
   */
  timeZone: string;
  children: React.ReactNode;
};

export function CompanyTimezoneProvider({
  timeZone,
  children,
}: CompanyTimezoneProviderProps) {
  const resolvedTimeZone = timeZone?.trim() || DEFAULT_COMPANY_TIMEZONE;

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
