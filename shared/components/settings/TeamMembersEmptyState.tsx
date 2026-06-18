import { SearchX, UserPlus, Users } from "lucide-react";

type TeamMembersEmptyStateProps = {
  variant: "no-members" | "no-results";
  canManageTeam?: boolean;
  northStar?: boolean;
};

export function TeamMembersEmptyState({
  variant,
  canManageTeam = false,
  northStar = false,
}: TeamMembersEmptyStateProps) {
  const isNoResults = variant === "no-results";

  if (northStar) {
    return (
      <div className="px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-6 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)]">
            {isNoResults ? (
              <SearchX className="h-6 w-6 text-[#8A6324]" />
            ) : (
              <Users className="h-6 w-6 text-[#8A6324]" />
            )}
          </div>

          <h3 className="mt-4 text-lg font-bold text-[#17130E]">
            {isNoResults ? "No members match your search" : "You're the only member so far"}
          </h3>

          <p className="mt-2 max-w-sm text-sm text-[#6B6255]">
            {isNoResults
              ? "Try a different name, email, or role."
              : canManageTeam
                ? "Use the invite form above when you're ready to add technicians or office staff."
                : "Team members will appear here once your admin invites them."}
          </p>

          {!isNoResults && canManageTeam ? (
            <p className="mt-4 flex items-center gap-2 text-xs text-[#6B6255]">
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Invites stay pending until the teammate signs up with the same email
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-empty-wrap">
      <div className="flex flex-col items-center justify-center text-center">
      <div className="admin-empty-icon">
        {isNoResults ? (
          <SearchX className="h-7 w-7 text-slate-400" />
        ) : (
          <Users className="h-7 w-7 text-slate-400" />
        )}
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">
        {isNoResults ? "No members match your search" : "You're the only member so far"}
      </h3>

      <p className="mt-2 max-w-sm text-sm text-slate-500">
        {isNoResults
          ? "Try a different name, email, or role."
          : canManageTeam
            ? "Use the invite form above when you're ready to add technicians or office staff."
            : "Team members will appear here once your admin invites them."}
      </p>

      {!isNoResults && canManageTeam ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Invites stay pending until the teammate signs up with the same email
        </p>
      ) : null}
      </div>
    </div>
  );
}
