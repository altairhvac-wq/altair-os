import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HorizonHero } from "@/shared/design-system/signature";
import type { NorthStarSampleData } from "./sample-data";

const signalToneClass = {
  neutral: "text-slate-600",
  attention: "text-slate-800",
  positive: "text-emerald-800/90",
} as const;

type OperatingPictureSectionProps = {
  data: Pick<
    NorthStarSampleData,
    | "greeting"
    | "operatingSentence"
    | "primaryAction"
    | "secondaryAction"
    | "signals"
  >;
};

export function OperatingPictureSection({ data }: OperatingPictureSectionProps) {
  return (
    <HorizonHero tone="neutral" beamTone="cyan" beamPosition="left" size="cockpit">
      <div className="flex flex-col gap-5 lg:gap-6">
        <div className="flex flex-col gap-3 lg:max-w-3xl">
          <p className="text-sm font-medium text-slate-500">{data.greeting}</p>
          <h1 className="text-pretty text-2xl font-semibold leading-[1.2] tracking-tight text-slate-900 sm:text-3xl lg:text-[2rem]">
            {data.operatingSentence}
          </h1>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-2 lg:gap-x-8">
          {data.signals.map((signal) => (
            <li
              key={signal.label}
              className={`inline-flex items-center gap-2 text-sm font-medium ${signalToneClass[signal.emphasis ?? "neutral"]}`}
            >
              <span
                aria-hidden="true"
                className={`h-1 w-1 shrink-0 rounded-full ${
                  signal.emphasis === "attention"
                    ? "bg-amber-500/80"
                    : signal.emphasis === "positive"
                      ? "bg-emerald-500/70"
                      : "bg-slate-300"
                }`}
              />
              {signal.label}
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            href={data.primaryAction.href}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            {data.primaryAction.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {data.secondaryAction ? (
            <Link
              href={data.secondaryAction.href}
              className="inline-flex h-10 items-center justify-center rounded-xl px-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {data.secondaryAction.label}
            </Link>
          ) : null}
        </div>
      </div>
    </HorizonHero>
  );
}
