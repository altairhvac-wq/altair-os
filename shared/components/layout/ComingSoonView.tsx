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
    <div className="mx-auto flex w-full max-w-xl flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 ring-1 ring-sky-100">
        <Construction className="h-6 w-6 text-sky-600" aria-hidden="true" />
      </div>
      <h1 className="mt-4 text-lg font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
