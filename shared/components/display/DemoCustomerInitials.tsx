"use client";

import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";
import { getCustomerInitials } from "@/shared/types/customer";

type DemoCustomerInitialsProps = {
  name: string;
};

export function DemoCustomerInitials({ name }: DemoCustomerInitialsProps) {
  const formatDisplayName = useFormatDemoDisplayName();
  return <>{getCustomerInitials(formatDisplayName(name))}</>;
}
