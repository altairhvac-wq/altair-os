"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronDown } from "lucide-react";
import { switchCompanyAction } from "@/app/actions/company-switcher";
import type { MembershipWithCompany } from "@/lib/database/types";
import {
  COMPANY_ROLE_LABELS,
  normalizeCompanyRole,
} from "@/lib/database/types/roles";

type CompanySwitcherProps = {
  activeCompanyId: string;
  companies: MembershipWithCompany[];
  variant?: "admin" | "technician";
  showRole?: boolean;
  className?: string;
};

function getRoleLabel(membership: MembershipWithCompany) {
  const role = normalizeCompanyRole(membership.role);
  return role ? COMPANY_ROLE_LABELS[role] : "Member";
}

export function CompanySwitcher({
  activeCompanyId,
  companies,
  variant = "admin",
  showRole = true,
  className = "",
}: CompanySwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const activeMembership =
    companies.find((membership) => membership.company_id === activeCompanyId) ??
    companies[0];
  const canSwitch = companies.length > 1;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  if (!activeMembership) {
    return null;
  }

  function handleSwitch(companyId: string) {
    if (!canSwitch || companyId === activeCompanyId || isPending) {
      setOpen(false);
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await switchCompanyAction(companyId);

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  if (!canSwitch) {
    if (variant === "technician") {
      return (
        <p className={`truncate text-xs text-slate-500 ${className}`}>
          {activeMembership.company.name}
        </p>
      );
    }

    return (
      <div className={`hidden text-right md:block ${className}`}>
        <p className="text-sm font-semibold text-slate-900">
          {activeMembership.company.name}
        </p>
        {showRole ? (
          <p className="text-xs text-slate-500">
            {getRoleLabel(activeMembership)}
          </p>
        ) : null}
      </div>
    );
  }

  const triggerClasses =
    variant === "technician"
      ? "flex w-full min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-slate-100 disabled:opacity-60"
      : "flex max-w-[12rem] items-center gap-1 rounded-lg px-2 py-1 text-left transition-colors hover:bg-slate-100 disabled:opacity-60 sm:max-w-[14rem]";

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={isPending}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Switch company"
        className={triggerClasses}
      >
        {variant === "admin" ? (
          <Building2 className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" />
        ) : null}
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate font-semibold text-slate-900 ${
              variant === "technician" ? "text-xs" : "text-sm"
            }`}
          >
            {activeMembership.company.name}
          </span>
          {showRole ? (
            <span className="block truncate text-xs text-slate-500">
              {getRoleLabel(activeMembership)}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label="Companies"
          className={`absolute z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg ${
            variant === "technician" ? "left-0" : "right-0"
          }`}
        >
          {companies.map((membership) => {
            const isActive = membership.company_id === activeCompanyId;

            return (
              <button
                key={membership.company_id}
                type="button"
                role="option"
                aria-selected={isActive}
                disabled={isPending || isActive}
                onClick={() => handleSwitch(membership.company_id)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 disabled:cursor-default disabled:opacity-70"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {membership.company.name}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {getRoleLabel(membership)}
                  </span>
                </span>
                {isActive ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
