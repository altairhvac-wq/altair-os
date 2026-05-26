import { Construction } from "lucide-react";

type ComingSoonViewProps = {
  title?: string;
  description?: string;
};

export function ComingSoonView({
  title = "Coming soon",
  description = "This area is being prepared for the next release. Check back after the internal alpha rollout.",
}: ComingSoonViewProps) {
  return (
    <div className="admin-card mx-auto flex w-full max-w-xl flex-col items-center px-6 py-12 text-center sm:px-8 sm:py-14">
      <div className="admin-empty-icon">
        <Construction className="h-6 w-6 text-sky-600" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-lg font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
