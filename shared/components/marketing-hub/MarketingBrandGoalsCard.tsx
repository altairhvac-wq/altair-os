"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, PenLine, Settings2, Sparkles } from "lucide-react";
import {
  saveMarketingBrandKitAction,
  saveMarketingHqConfigAction,
} from "@/app/actions/marketing-ai-hq";
import {
  ALTAIR_BRAND_KIT_SEED,
  ALTAIR_HQ_CONFIG_SEED,
} from "@/shared/components/marketing-hq/altair-hq-seed";
import type {
  MarketingBrandKit,
  MarketingHqConfig,
} from "@/shared/types/marketing-ai-hq";

/**
 * Brand & goals — what every marketing agent writes from.
 *
 * Moved here from the retired Marketing HQ page (2026-10-25), unchanged: the
 * same fields, the same two save actions, the same seeds. The form body below
 * is the HQ page's former Settings tab verbatim; only the wrapper that runs
 * the saves and reports the result is new.
 */

type Flash = { tone: "success" | "error"; message: string } | null;

function listToLines(values: string[]): string {
  return values.join("\n");
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function commaToList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

type SettingsTabProps = {
  config: MarketingHqConfig;
  brandKit: MarketingBrandKit;
  isPending: boolean;
  onSaveConfig: (input: MarketingHqConfig) => void;
  onSaveBrandKit: (input: MarketingBrandKit) => void;
};

function SettingsTab({
  config,
  brandKit,
  isPending,
  onSaveConfig,
  onSaveBrandKit,
}: SettingsTabProps) {
  const [mission, setMission] = useState(config.mission);
  const [audience, setAudience] = useState(config.audience);
  const [positioning, setPositioning] = useState(config.positioning);
  const [goals, setGoals] = useState(config.goals);
  const [channels, setChannels] = useState(config.channels.join(", "));
  const [weeklyPostTarget, setWeeklyPostTarget] = useState(
    String(config.weeklyPostTarget),
  );

  const profile = config.industryProfile;
  const [industry, setIndustry] = useState(profile.industry);
  const [focus, setFocus] = useState(profile.focus);
  const [businessSize, setBusinessSize] = useState(profile.businessSize);
  const [location, setLocation] = useState(profile.location);
  const [services, setServices] = useState(profile.services.join(", "));
  const [idealCustomer, setIdealCustomer] = useState(profile.idealCustomer);
  const [seasonalityNotes, setSeasonalityNotes] = useState(
    profile.seasonalityNotes,
  );
  const [commonObjections, setCommonObjections] = useState(
    listToLines(profile.commonObjections),
  );
  const [typicalJobValues, setTypicalJobValues] = useState(
    profile.typicalJobValues,
  );
  const [preferredChannels, setPreferredChannels] = useState(
    profile.preferredChannels.join(", "),
  );
  const [competitorNotes, setCompetitorNotes] = useState(
    profile.competitorNotes,
  );
  const [seedLoaded, setSeedLoaded] = useState(false);

  function buildConfigInput(): MarketingHqConfig {
    return {
      mission,
      audience,
      positioning,
      goals,
      channels: commaToList(channels),
      weeklyPostTarget: Number(weeklyPostTarget) || 5,
      industryProfile: {
        industry,
        focus,
        businessSize,
        location,
        services: commaToList(services),
        idealCustomer,
        seasonalityNotes,
        commonObjections: linesToList(commonObjections),
        typicalJobValues,
        preferredChannels: commaToList(preferredChannels),
        competitorNotes,
      },
    };
  }

  const [voice, setVoice] = useState(brandKit.voice);
  const [style, setStyle] = useState(brandKit.style);
  const [bannedClaims, setBannedClaims] = useState(
    listToLines(brandKit.bannedClaims),
  );
  const [sampleHooks, setSampleHooks] = useState(
    listToLines(brandKit.sampleHooks),
  );
  const [visualNotes, setVisualNotes] = useState(brandKit.visualNotes);

  function applyAltairDefaults() {
    const seed = ALTAIR_HQ_CONFIG_SEED;
    setMission(seed.mission);
    setAudience(seed.audience);
    setPositioning(seed.positioning);
    setGoals(seed.goals);
    setChannels(seed.channels.join(", "));
    setWeeklyPostTarget(String(seed.weeklyPostTarget));

    const seedProfile = seed.industryProfile;
    setIndustry(seedProfile.industry);
    setFocus(seedProfile.focus);
    setBusinessSize(seedProfile.businessSize);
    setLocation(seedProfile.location);
    setServices(seedProfile.services.join(", "));
    setIdealCustomer(seedProfile.idealCustomer);
    setSeasonalityNotes(seedProfile.seasonalityNotes);
    setCommonObjections(listToLines(seedProfile.commonObjections));
    setTypicalJobValues(seedProfile.typicalJobValues);
    setPreferredChannels(seedProfile.preferredChannels.join(", "));
    setCompetitorNotes(seedProfile.competitorNotes);

    const seedKit = ALTAIR_BRAND_KIT_SEED;
    setVoice(seedKit.voice);
    setStyle(seedKit.style);
    setBannedClaims(listToLines(seedKit.bannedClaims));
    setSampleHooks(listToLines(seedKit.sampleHooks));
    setVisualNotes(seedKit.visualNotes);

    setSeedLoaded(true);
  }

  const fieldClass =
    "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none";
  const labelClass = "block text-xs font-semibold text-slate-700";

  return (
    <div className="grid gap-6 px-4 py-4 sm:px-5 lg:grid-cols-2">
      <section className="flex flex-col gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Skip the typing — load the Altair defaults
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Pre-fills every field below from the Marketing AI Foundation and
              brand guidelines. Review, tweak anything that reads wrong, then
              hit the save buttons — nothing is saved until you do.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={applyAltairDefaults}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {seedLoaded ? "Defaults loaded — review below" : "Load Altair defaults"}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            HQ goals (the command center)
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Every role reads this before doing anything. Mission, audience, and
          goals are required.
        </p>

        <div className="mt-3 space-y-3">
          <label className={labelClass}>
            Mission — what we are marketing
            <textarea
              value={mission}
              onChange={(event) => setMission(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Altair OS — field-service software built by a working HVAC founder."
            />
          </label>
          <label className={labelClass}>
            Audience
            <textarea
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Owners of small HVAC, plumbing, and electrical businesses (1-15 techs)."
            />
          </label>
          <label className={labelClass}>
            Positioning
            <textarea
              value={positioning}
              onChange={(event) => setPositioning(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="The only field-service platform built in the field, not a boardroom."
            />
          </label>
          <label className={labelClass}>
            Current goals
            <textarea
              value={goals}
              onChange={(event) => setGoals(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Find founding beta companies; grow the waitlist; build in public."
            />
          </label>
          <label className={labelClass}>
            Channel focus (comma-separated)
            <input
              value={channels}
              onChange={(event) => setChannels(event.target.value)}
              className={fieldClass}
              placeholder="facebook, instagram, x, linkedin"
            />
          </label>
          <label className={labelClass}>
            Posts per copywriter batch (1-10)
            <input
              value={weeklyPostTarget}
              onChange={(event) => setWeeklyPostTarget(event.target.value)}
              inputMode="numeric"
              className={fieldClass}
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => onSaveConfig(buildConfigInput())}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save HQ goals
        </button>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-4">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Brand kit</h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Voice rules every draft inherits. The honesty rules (no invented
          customers, revenue, or integrations) always apply on top.
        </p>

        <div className="mt-3 space-y-3">
          <label className={labelClass}>
            Voice &amp; tone
            <textarea
              value={voice}
              onChange={(event) => setVoice(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Honest, founder-led, practical — not hypey."
            />
          </label>
          <label className={labelClass}>
            Writing style
            <textarea
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Plain language a busy contractor reads in ten seconds."
            />
          </label>
          <label className={labelClass}>
            Additional banned claims (one per line)
            <textarea
              value={bannedClaims}
              onChange={(event) => setBannedClaims(event.target.value)}
              rows={3}
              className={fieldClass}
              placeholder={"Naming specific competitors negatively\nPricing promises"}
            />
          </label>
          <label className={labelClass}>
            Approved hooks (one per line)
            <textarea
              value={sampleHooks}
              onChange={(event) => setSampleHooks(event.target.value)}
              rows={3}
              className={fieldClass}
              placeholder={"I just shipped another piece of Altair OS…\nSmall contractors should not need five different tools…"}
            />
          </label>
          <label className={labelClass}>
            Visual notes (for future briefs)
            <textarea
              value={visualNotes}
              onChange={(event) => setVisualNotes(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Brand black + gold gradient; never purple; real product screenshots over stock art."
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            onSaveBrandKit({
              voice,
              style,
              bannedClaims: linesToList(bannedClaims),
              sampleHooks: linesToList(sampleHooks),
              visualNotes,
            })
          }
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save brand kit
        </button>
      </section>

      <section className="rounded-xl border border-slate-200/90 bg-white p-4 lg:col-span-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">
            Industry profile
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Loaded before every AI task so recommendations fit this specific
          business — never a generic contractor. Saved together with HQ goals.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Industry
            <input
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className={fieldClass}
              placeholder="Software for field-service trades"
            />
          </label>
          <label className={labelClass}>
            Residential / commercial focus
            <input
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              className={fieldClass}
              placeholder="Both"
            />
          </label>
          <label className={labelClass}>
            Business size
            <input
              value={businessSize}
              onChange={(event) => setBusinessSize(event.target.value)}
              className={fieldClass}
              placeholder="Solo founder"
            />
          </label>
          <label className={labelClass}>
            Location / market
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={fieldClass}
              placeholder="United States (online)"
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Services / offerings (comma-separated)
            <input
              value={services}
              onChange={(event) => setServices(event.target.value)}
              className={fieldClass}
              placeholder="CRM, scheduling, dispatch, estimates, invoicing, payments"
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Ideal customer
            <textarea
              value={idealCustomer}
              onChange={(event) => setIdealCustomer(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Owner-operators of 1-15 tech trades businesses drowning in office work."
            />
          </label>
          <label className={labelClass}>
            Seasonality notes
            <textarea
              value={seasonalityNotes}
              onChange={(event) => setSeasonalityNotes(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="HVAC buyers busiest in summer/winter rushes; software decisions in shoulder seasons."
            />
          </label>
          <label className={labelClass}>
            Common objections (one per line)
            <textarea
              value={commonObjections}
              onChange={(event) => setCommonObjections(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder={"Already using spreadsheets\nSwitching costs / data migration"}
            />
          </label>
          <label className={labelClass}>
            Typical job / deal values
            <input
              value={typicalJobValues}
              onChange={(event) => setTypicalJobValues(event.target.value)}
              className={fieldClass}
              placeholder="Monthly SaaS subscription tiers"
            />
          </label>
          <label className={labelClass}>
            Preferred channels (comma-separated)
            <input
              value={preferredChannels}
              onChange={(event) => setPreferredChannels(event.target.value)}
              className={fieldClass}
              placeholder="facebook, instagram, youtube, seo"
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Competitor landscape
            <textarea
              value={competitorNotes}
              onChange={(event) => setCompetitorNotes(event.target.value)}
              rows={2}
              className={fieldClass}
              placeholder="Jobber, ServiceTitan, Housecall Pro — enterprise tools or single-department point solutions."
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => onSaveConfig(buildConfigInput())}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Save industry profile
        </button>
      </section>
    </div>
  );
}

export function MarketingBrandGoalsCard({
  config,
  brandKit,
}: {
  config: MarketingHqConfig;
  brandKit: MarketingBrandKit;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState<Flash>(null);

  function save(work: () => Promise<{ error?: string } | undefined | void>, done: string) {
    setFlash(null);
    startTransition(async () => {
      const result = await work();
      if (result && "error" in result && result.error) {
        setFlash({ tone: "error", message: result.error });
        return;
      }
      setFlash({ tone: "success", message: done });
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border border-[var(--north-star-plate-border)] bg-[var(--north-star-plate)]">
      <header className="px-6 pt-6">
        <h2 className="text-lg font-semibold text-altair-ink">Brand &amp; goals</h2>
        <p className="mt-1 text-sm text-altair-ink-muted">
          Mission, audience, positioning, goals, voice and banned claims. Every
          marketing agent writes from this.
        </p>
        {flash ? (
          <p
            className={`mt-2 text-sm ${flash.tone === "error" ? "text-altair-danger" : "text-altair-success"}`}
          >
            {flash.message}
          </p>
        ) : null}
      </header>
      <SettingsTab
        config={config}
        brandKit={brandKit}
        isPending={isPending}
        onSaveConfig={(input) => save(() => saveMarketingHqConfigAction(input), "Goals saved.")}
        onSaveBrandKit={(input) => save(() => saveMarketingBrandKitAction(input), "Brand kit saved.")}
      />
    </section>
  );
}
