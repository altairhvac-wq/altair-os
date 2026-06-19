"use client";

import {
  formatTechnicianSpecialtyLabels,
  isJobEligibleTeamRole,
  TECHNICIAN_SPECIALTY_OPTIONS,
  type TechnicianSpecialty,
} from "@/shared/types/technician-specialties";

type TeamMemberSpecialtiesFieldProps = {
  specialties: readonly string[];
  canEdit: boolean;
  disabled?: boolean;
  compact?: boolean;
  variant?: "legacy" | "northStar";
  onChange?: (specialties: TechnicianSpecialty[]) => void;
};

function TeamMemberSpecialtyChips({
  specialties,
  compact = false,
  northStar = false,
}: {
  specialties: readonly string[];
  compact?: boolean;
  northStar?: boolean;
}) {
  const labels = formatTechnicianSpecialtyLabels(specialties);

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label) => (
        <span
          key={label}
          className={
            northStar
              ? `inline-flex items-center rounded-full border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] font-medium text-[#4F4638] ${
                  compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"
                }`
              : `inline-flex items-center rounded-full border border-slate-200 bg-slate-50 font-medium text-slate-700 ${
                  compact ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-0.5 text-xs"
                }`
          }
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function TeamMemberSpecialtiesField({
  specialties,
  canEdit,
  disabled = false,
  compact = false,
  variant = "legacy",
  onChange,
}: TeamMemberSpecialtiesFieldProps) {
  const northStar = variant === "northStar";
  const selected = new Set(
    specialties.filter((value): value is TechnicianSpecialty =>
      (TECHNICIAN_SPECIALTY_OPTIONS as readonly string[]).includes(value),
    ),
  );

  function toggleSpecialty(specialty: TechnicianSpecialty) {
    if (!canEdit || disabled || !onChange) {
      return;
    }

    const next = new Set(selected);

    if (next.has(specialty)) {
      next.delete(specialty);
    } else {
      next.add(specialty);
    }

    onChange(
      TECHNICIAN_SPECIALTY_OPTIONS.filter((option) => next.has(option)),
    );
  }

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {!northStar ? (
        <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Specialties
        </span>
      ) : null}

      {canEdit ? (
        <div className="flex flex-wrap gap-1">
          {TECHNICIAN_SPECIALTY_OPTIONS.map((specialty) => {
            const isSelected = selected.has(specialty);

            return (
              <button
                key={specialty}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                onClick={() => toggleSpecialty(specialty)}
                className={
                  northStar
                    ? `inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? "border-[#B88A2E] bg-[#EFE4CB] text-[#17130E] ring-1 ring-[rgba(201,164,77,0.28)]"
                          : "border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] text-[#4F4638] hover:border-[rgba(201,164,77,0.35)] hover:bg-[#F3EBDD]"
                      }`
                    : `inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isSelected
                          ? "border-cyan-600 bg-cyan-50 text-cyan-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`
                }
              >
                {specialty}
              </button>
            );
          })}
        </div>
      ) : (
        <TeamMemberSpecialtyChips
          specialties={specialties}
          compact={compact}
          northStar={northStar}
        />
      )}
    </div>
  );
}

export function shouldShowMemberSpecialties(role: string): boolean {
  return isJobEligibleTeamRole(role);
}
