"use client";

import type { CompanyRole } from "@/lib/database/types/enums";
import {
  formatTeamMemberRole,
} from "@/shared/types/team-member";
import { getTeamRoleDescription } from "@/shared/lib/team-role-descriptions";
import { adminFormInputClass } from "@/shared/lib/admin-density";
import { st } from "@/shared/components/settings/north-star-m10/settings-north-star-styles";

type RoleSelectorFieldProps = {
  id?: string;
  value: CompanyRole;
  roles: readonly CompanyRole[];
  onChange: (role: CompanyRole) => void;
  disabled?: boolean;
  label?: string;
  showDescription?: boolean;
  /** Boxed card (default) or compact lines below the select. */
  descriptionLayout?: "boxed" | "inline";
  compact?: boolean;
  northStar?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function RoleSelectorField({
  id,
  value,
  roles,
  onChange,
  disabled = false,
  label = "Role",
  showDescription = true,
  descriptionLayout = "boxed",
  compact = false,
  northStar = false,
  className,
  "aria-label": ariaLabel,
}: RoleSelectorFieldProps) {
  const description = getTeamRoleDescription(value);
  const selectClass = `${
    northStar ? st.formInput : adminFormInputClass
  } shadow-sm disabled:opacity-60`;

  return (
    <div className={`${compact ? "space-y-1.5" : "space-y-2"} ${className ?? ""}`}>
      <label className="block" htmlFor={id}>
        <span
          className={`mb-1 block text-xs font-semibold uppercase tracking-wide ${
            northStar ? "text-[#4F4638]" : "text-slate-500"
          }`}
        >
          {label}
        </span>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as CompanyRole)}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          className={selectClass}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {formatTeamMemberRole(role)}
            </option>
          ))}
          {value === "customer" && !roles.includes("customer") ? (
            <option value="customer">{formatTeamMemberRole("customer")}</option>
          ) : null}
        </select>
      </label>

      {showDescription && description ? (
        descriptionLayout === "inline" ? (
          <div className="min-w-0">
            <p
              className={`text-xs leading-snug ${
                northStar ? "text-[#4F4638]" : "text-slate-700"
              }`}
            >
              {description.summary}
            </p>
            <p
              className={`mt-0.5 text-[11px] leading-snug ${
                northStar ? "text-[#64748B]" : "text-slate-500"
              }`}
            >
              {description.access}
            </p>
          </div>
        ) : (
          <div
            className={
              northStar
                ? "rounded-lg border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-3 py-2.5"
                : "rounded-lg border border-slate-100 bg-white px-3 py-2.5"
            }
          >
            <p
              className={`text-xs font-medium ${
                northStar ? "text-[#4F4638]" : "text-slate-700"
              }`}
            >
              {description.summary}
            </p>
            <p
              className={`mt-1 text-xs ${
                northStar ? "text-[#64748B]" : "text-slate-500"
              }`}
            >
              {description.access}
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
