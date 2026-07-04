import Link from "next/link";
import { ArrowRight, Brain } from "lucide-react";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import type { PlatformBrainSnapshot } from "@/shared/types/platform-admin";

type PlatformMissionHeroProps = {
  brain: PlatformBrainSnapshot;
  northStar?: boolean;
};

function NorthStarPrimaryAction({
  title,
  description,
  actionLabel,
  href,
}: {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <Link href={href} className={`group block ${t.primaryAction}`}>
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={t.accentBadge}>Do this first</span>
          </div>
          <p className="mt-2 text-lg font-semibold leading-snug text-white sm:text-xl">
            {title}
          </p>
          <p className={`mt-2 ${t.darkSurfaceText}`}>{description}</p>
        </div>
        <span className={t.accentCta}>
          {actionLabel}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

function NorthStarClearCard() {
  return (
    <div className={t.primaryAction}>
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={t.accentBadge}>Platform clear</span>
          </div>
          <p className="mt-2 text-lg font-semibold leading-snug text-white sm:text-xl">
            No urgent founder actions right now
          </p>
          <p className={`mt-2 ${t.darkSurfaceText}`}>
            Beta companies and bug queues look stable — check activation progress
            below when you have a minute.
          </p>
        </div>
      </div>
    </div>
  );
}

function LegacyPrimaryAction({
  title,
  description,
  actionLabel,
  href,
}: {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-950 via-slate-900 to-slate-950 p-4 text-white transition hover:border-cyan-300 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
          Do this first
        </p>
        <p className="mt-2 text-lg font-bold leading-snug">{title}</p>
        <p className="mt-2 text-sm text-slate-300">{description}</p>
      </div>
      <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white group-hover:bg-cyan-400">
        {actionLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

function LegacyClearCard() {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 sm:px-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
        Platform clear
      </p>
      <p className="mt-2 text-lg font-bold text-emerald-950">
        No urgent founder actions right now
      </p>
      <p className="mt-2 text-sm text-emerald-900/80">
        Beta companies and bug queues look stable.
      </p>
    </div>
  );
}

export function PlatformMissionHero({
  brain,
  northStar = false,
}: PlatformMissionHeroProps) {
  const { missionHero } = brain;
  const primary = missionHero.primarySignal;

  if (northStar) {
    return (
      <section aria-label="Founder command" className={t.heroShell}>
        <div aria-hidden="true" className={t.heroAccentRail} />

        <div className={t.heroHeader}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <Brain className="h-4 w-4 text-[#C9A44D]" aria-hidden="true" />
                <span className={t.eyebrowAccent}>Founder brain</span>
              </div>
              <h1 className={`mt-2 ${t.heroTitle}`}>{missionHero.title}</h1>
              <p className={`mt-1.5 max-w-2xl ${t.bodySecondary}`}>
                {missionHero.operatingMessage}
              </p>
            </div>
          </div>
        </div>

        <div className={t.heroBody}>
          {primary ? (
            <NorthStarPrimaryAction
              title={primary.title}
              description={primary.description}
              actionLabel={primary.actionLabel}
              href={primary.href}
            />
          ) : (
            <NorthStarClearCard />
          )}

          {missionHero.signalChips.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {missionHero.signalChips.map((chip) => (
                <div key={chip.label} className={t.signalChip}>
                  <span className="text-base font-semibold tabular-nums leading-none text-white">
                    {chip.value}
                  </span>
                  <span className={t.signalLabel}>{chip.label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div aria-hidden="true" className={t.heroFooter}>
          <div className={t.accentLine} />
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Founder command"
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-cyan-700" aria-hidden="true" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
          Founder brain
        </p>
      </div>
      <h1 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">
        {missionHero.title}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        {missionHero.operatingMessage}
      </p>

      <div className="mt-4">
        {primary ? (
          <LegacyPrimaryAction
            title={primary.title}
            description={primary.description}
            actionLabel={primary.actionLabel}
            href={primary.href}
          />
        ) : (
          <LegacyClearCard />
        )}
      </div>

      {missionHero.signalChips.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {missionHero.signalChips.map((chip) => (
            <div key={chip.label} className="admin-metric-card">
              <p className="admin-metric-label">{chip.label}</p>
              <p className="admin-metric-value mt-1 sm:text-xl">{chip.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}