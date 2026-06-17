import { MomentumStrip } from "@/shared/design-system/signature";

type TeamMomentumSectionProps = {
  momentum: string[];
};

export function TeamMomentumSection({ momentum }: TeamMomentumSectionProps) {
  return (
    <section aria-labelledby="team-momentum-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2
          id="team-momentum-heading"
          className="text-base font-semibold tracking-tight text-slate-800"
        >
          Team momentum
        </h2>
        <p className="text-sm text-slate-500">
          Quiet progress worth noticing — secondary to what needs action.
        </p>
      </div>
      <MomentumStrip items={momentum.map((label) => ({ label }))} />
    </section>
  );
}
