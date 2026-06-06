"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useFormatDemoDisplayName } from "@/shared/components/display/FounderMarketingDisplayContext";
import { customerDetailHref } from "@/shared/lib/customers/customer-action-links";

type CustomerNameLinkProps = {
  customerId: string | undefined | null;
  customerName: ReactNode;
  canManageCustomers: boolean;
  className?: string;
  linkClassName?: string;
  stopRowNavigation?: boolean;
};

export function CustomerNameLink({
  customerId,
  customerName,
  canManageCustomers,
  className,
  linkClassName = "font-medium text-slate-900 transition-colors hover:text-cyan-700",
  stopRowNavigation = false,
}: CustomerNameLinkProps) {
  const formatDisplayName = useFormatDemoDisplayName();
  const resolvedId = customerId?.trim();
  const resolvedCustomerName =
    typeof customerName === "string"
      ? formatDisplayName(customerName)
      : customerName;

  if (!canManageCustomers || !resolvedId) {
    return <span className={className}>{resolvedCustomerName}</span>;
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (stopRowNavigation) {
      event.stopPropagation();
    }
  }

  return (
    <Link
      href={customerDetailHref(resolvedId)}
      className={linkClassName}
      onClick={stopRowNavigation ? handleClick : undefined}
    >
      {resolvedCustomerName}
    </Link>
  );
}
