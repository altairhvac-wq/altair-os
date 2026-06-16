"use client";

import type { CompanyRole } from "@/lib/database/types/enums";
import {
  formatTeamMemberRole,
} from "@/shared/types/team-member";
import { getTeamRoleDescription } from "@/shared/lib/team-role-descriptions";
import { adminFormInputClass } from "@/shared/lib/admin-density";

type RoleSelectorFieldProps = {
  id?: string;
  value: CompanyRole;
  roles: readonly CompanyRole[];
  onChange: (role: CompanyRole) => void;
  disabled?: boolean;
  label?: string;
  showDescription?: boolean;
  compact?: boolean;
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
  compact = false,
  "aria-label": ariaLabel,
}: RoleSelectorFieldProps) {
  const description = getTeamRoleDescription(value);
  const selectClass = `${adminFormInputClass} shadow-sm disabled:opacity-60`;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <label className="block" htmlFor={id}>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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
        <div className="rounded-lg border border-slate-100 bg-white px-3 py-2.5">
          <p className="text-xs font-medium text-slate-700">
            {description.summary}
          </p>
          <p className="mt-1 text-xs text-slate-500">{description.access}</p>
        </div>
      ) : null}
    </div>
  );
}
