"use client";

import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";

type DemoDisplayNameProps = {
  children: string | null | undefined;
};

export function DemoDisplayName({ children }: DemoDisplayNameProps) {
  const formatDisplayName = useFormatDemoDisplayName();
  return <>{formatDisplayName(children)}</>;
}
