"use client";

import {
  formatTeamMemberRole,
  type TeamMember,
} from "@/shared/types/team-member";

type ReportsToSelectorFieldProps = {
  id?: string;
  value: string | null;
  options: readonly TeamMember[];
  onChange: (reportsToMemberId: string | null) => void;
  disabled?: boolean;
  label?: string;
  compact?: boolean;
  "aria-label"?: string;
};

export function ReportsToSelectorField({
  id,
  value,
  options,
  onChange,
  disabled = false,
  label = "Reports to",
  compact = false,
  "aria-label": ariaLabel,
}: ReportsToSelectorFieldProps) {
  const selectClass = compact
    ? "w-full min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60 sm:min-h-[44px] sm:py-2.5"
    : "w-full min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60";

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <label className="block" htmlFor={id}>
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <select
          id={id}
          value={value ?? ""}
          onChange={(event) => {
            const nextValue = event.target.value.trim();
            onChange(nextValue.length > 0 ? nextValue : null);
          }}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          className={selectClass}
        >
          <option value="">No manager</option>
          {options.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({formatTeamMemberRole(member.role)})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
