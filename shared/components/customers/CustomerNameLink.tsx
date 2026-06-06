import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
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
  const resolvedId = customerId?.trim();

  if (!canManageCustomers || !resolvedId) {
    return <span className={className}>{customerName}</span>;
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
      {customerName}
    </Link>
  );
}
