import { SearchX, UserPlus, Users } from "lucide-react";

type TeamMembersEmptyStateProps = {
  variant: "no-members" | "no-results";
  canManageTeam?: boolean;
};

export function TeamMembersEmptyState({
  variant,
  canManageTeam = false,
}: TeamMembersEmptyStateProps) {
  const isNoResults = variant === "no-results";

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
