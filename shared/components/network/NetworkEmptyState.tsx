import { SearchX, UserPlus, Users, Briefcase, DollarSign } from "lucide-react";

type NetworkEmptyStateProps = {
  variant: "no-partners" | "no-jobs" | "no-results" | "no-revenue";
  onAddPartner?: () => void;
};

const config: Record<
  NetworkEmptyStateProps["variant"],
  { icon: typeof Users; title: string; description: string }
> = {
  "no-partners": {
    icon: Users,
    title: "No preferred partners yet",
    description:
      "Build your private network by saving companies you trust. Your preferred partners appear here — not on a public marketplace.",
  },
  "no-jobs": {
    icon: Briefcase,
    title: "No subcontract jobs",
    description:
      "Jobs you send to partners or receive from your network will appear here.",
  },
  "no-results": {
    icon: SearchX,
    title: "No matches found",
    description:
      "Try adjusting your search or filters to find partners or jobs in your network.",
  },
  "no-revenue": {
    icon: DollarSign,
    title: "No revenue data yet",
    description:
      "Complete subcontract work with your partners to track payouts, earnings, and top relationships.",
  },
};

export function NetworkEmptyState({
  variant,
  onAddPartner,
}: NetworkEmptyStateProps) {
  const { icon: Icon, title, description } = config[variant];
  const isNoPartners = variant === "no-partners";

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/5 ring-1 ring-slate-200">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        {description}
      </p>

      {isNoPartners && onAddPartner ? (
        <button
          type="button"
          onClick={onAddPartner}
          className="mt-6 inline-flex items-center gap-2 admin-btn-primary"
        >
          <UserPlus className="h-4 w-4" />
          Add your first partner
        </button>
      ) : null}
    </div>
  );
}
