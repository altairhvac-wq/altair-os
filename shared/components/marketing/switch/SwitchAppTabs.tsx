"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Check, ChevronRight, Info, Minus } from "lucide-react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import {
  ALTAIR_STEPS_FOOTNOTE,
  buildAltairSteps,
  SWITCH_APPS,
  SWITCH_FACTS_CHECKED,
  type SwitchApp,
  type SwitchAppId,
  type SwitchStep,
} from "@/shared/lib/site/switch-page";

/** The address only changes through `choose` below, which sets state itself. */
const noSubscription = () => () => {};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#77591B]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6efe2]";

/**
 * The app picker and one panel per app. Every panel is in the HTML (search
 * engines and phones without JavaScript read all of them); only the chosen
 * one is shown. The choice is kept in the address (?from=jobber) so a link
 * from a comparison page or an email opens the right tab.
 */
export function SwitchAppTabs() {
  // The app named in the address on arrival. The server render (and so the
  // first paint and hydration) uses the first tab; React then re-renders with
  // the address's choice.
  const fromAddress = useSyncExternalStore(
    noSubscription,
    () => new URLSearchParams(window.location.search).get("from"),
    () => null,
  );
  const [chosen, setChosen] = useState<SwitchAppId | null>(null);
  const active: SwitchAppId = chosen ?? SWITCH_APPS.find((app) => app.id === fromAddress)?.id ?? SWITCH_APPS[0]!.id;
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // On a phone the tabs scroll sideways: keep the chosen one in view (sideways
  // only, so arriving with ?from= never moves the page itself).
  useEffect(() => {
    const tab = tabRefs.current[active];
    const strip = tab?.parentElement;
    if (!tab || !strip || strip.scrollWidth <= strip.clientWidth) return;
    const left = tab.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft || left + tab.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    }
  }, [active]);

  function choose(id: SwitchAppId, focus = false) {
    setChosen(id);
    trackEngagement("cta_click", `switch-tab-${id}`);
    const url = new URL(window.location.href);
    url.searchParams.set("from", id);
    window.history.replaceState(null, "", url);
    if (focus) tabRefs.current[id]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = SWITCH_APPS.findIndex((app) => app.id === active);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      choose(SWITCH_APPS[event.key === "Home" ? 0 : SWITCH_APPS.length - 1]!.id, true);
      return;
    }
    if (!step) return;
    event.preventDefault();
    const next = SWITCH_APPS[(index + step + SWITCH_APPS.length) % SWITCH_APPS.length]!;
    choose(next.id, true);
  }

  return (
    <div>
      <p id="switch-picker-label" className="text-sm font-semibold text-stone-600">
        What do you use now?
      </p>
      <div className="sticky top-[65px] z-20 -mx-5 mt-3 border-b border-[#e4d9c4] bg-[#f6efe2]/95 px-5 py-2.5 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:top-[69px] sm:px-2.5">
        <div
          role="tablist"
          aria-labelledby="switch-picker-label"
          onKeyDown={onKeyDown}
          className="flex gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden"
        >
          {SWITCH_APPS.map((app) => {
            const selected = app.id === active;
            return (
              <button
                key={app.id}
                ref={(node) => {
                  tabRefs.current[app.id] = node;
                }}
                type="button"
                role="tab"
                id={`switch-tab-${app.id}`}
                aria-selected={selected}
                aria-controls={`switch-panel-${app.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(app.id)}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-[15px] font-semibold transition-colors ${focusRing} ${
                  selected
                    ? "border-[#14120e] bg-[#14120e] text-[#fff9ea]"
                    : "border-[#e4d9c4] bg-white text-stone-700 hover:border-[#c2a05a]"
                }`}
              >
                {app.name}
              </button>
            );
          })}
        </div>
      </div>

      {SWITCH_APPS.map((app) => (
        <AppPanel key={app.id} app={app} hidden={app.id !== active} />
      ))}
    </div>
  );
}

function AppPanel({ app, hidden }: { app: SwitchApp; hidden: boolean }) {
  return (
    <section
      role="tabpanel"
      id={`switch-panel-${app.id}`}
      aria-labelledby={`switch-tab-${app.id}`}
      hidden={hidden}
      className="pt-7"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <figure>
          <div className="overflow-hidden rounded-2xl bg-[#0d110c] shadow-[0_30px_60px_-30px_rgba(60,40,10,0.55)]">
            <video
              className="aspect-video w-full"
              controls
              playsInline
              muted
              preload="none"
              poster={app.video.poster}
              onPlay={() => trackEngagement("video_play", `switch-${app.id}`)}
            >
              <source src={app.video.src} type="video/mp4" />
            </video>
          </div>
          <figcaption className="mt-2.5 text-[13px] leading-relaxed text-stone-500">{app.video.caption}</figcaption>
        </figure>

        <div className="rounded-2xl border border-[#e4d9c4] bg-white p-5 shadow-[0_1px_2px_rgba(20,18,14,0.04),0_14px_34px_-24px_rgba(90,68,24,0.35)] sm:p-6">
          <h3 className="text-lg font-semibold text-[#14120e]">What comes over {app.fromName}</h3>
          <ul className="mt-4 space-y-3.5">
            {app.carry.map((item) => (
              <li key={item.title} className="flex gap-3 text-[15px] leading-snug text-stone-600">
                <CarryIcon state={item.state} />
                <span>
                  <strong className="font-semibold text-[#14120e]">{item.title}.</strong> {item.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="mt-12 text-[1.5rem] font-semibold tracking-tight text-[#14120e] sm:text-[1.9rem]">
        Part 1: Export {app.fromName}
      </h3>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-600">{app.exportIntro}</p>
      <StepList steps={app.exportSteps} variant="export" />

      <h3 className="mt-12 text-[1.5rem] font-semibold tracking-tight text-[#14120e] sm:text-[1.9rem]">
        Part 2: Bring it into Altair
      </h3>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-600">{ALTAIR_STEPS_FOOTNOTE}</p>
      <StepList steps={buildAltairSteps(app)} variant="altair" />

      {app.beforeYouLeave ? (
        <aside className="mt-10 flex flex-col gap-3 rounded-2xl bg-[#14120e] p-5 text-[#f3ebdd] sm:flex-row sm:gap-5 sm:p-7">
          <AlertTriangle aria-hidden="true" className="h-6 w-6 shrink-0 text-[#e2c27e]" />
          <div>
            <h4 className="text-lg font-semibold text-[#fff9ea]">Export before you give notice</h4>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[#c9bfae]">{app.beforeYouLeave.text}</p>
            <p className="mt-2 text-xs text-[#8e826f]">
              Source:{" "}
              <a
                href={app.beforeYouLeave.source.href}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="underline underline-offset-4 hover:text-[#c9bfae]"
              >
                {app.beforeYouLeave.source.label}
              </a>
              , checked {SWITCH_FACTS_CHECKED}
            </p>
          </div>
        </aside>
      ) : null}

      {app.sources.length > 0 ? (
        <div className="mt-8 border-t border-[#e4d9c4] pt-4 text-xs leading-relaxed text-stone-500">
          <p className="font-semibold text-stone-700">Where these steps come from</p>
          <ul className="mt-1.5 space-y-1">
            {app.sources.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="underline-offset-4 hover:text-stone-800 hover:underline"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-1.5">Checked {SWITCH_FACTS_CHECKED}. Menus can change; if one has moved, the import screen still takes the file.</p>
        </div>
      ) : null}
    </section>
  );
}

function CarryIcon({ state }: { state: "yes" | "partial" | "no" }) {
  const base = "mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full";
  if (state === "yes") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700`}>
        <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
        <span className="sr-only">Comes over:</span>
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span className={`${base} bg-amber-100 text-amber-800`}>
        <Info aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
        <span className="sr-only">Partly:</span>
      </span>
    );
  }
  return (
    <span className={`${base} bg-stone-100 text-stone-500`}>
      <Minus aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
      <span className="sr-only">Stays behind:</span>
    </span>
  );
}

function StepList({ steps, variant }: { steps: readonly SwitchStep[]; variant: "export" | "altair" }) {
  return (
    <ol className="mt-6 grid gap-x-8 gap-y-7 md:grid-cols-2">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span
            aria-hidden="true"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
              variant === "export"
                ? "bg-[#14120e] text-[#e2c27e]"
                : "bg-[linear-gradient(180deg,#e2c27e,#c2a05a)] text-[#14120e]"
            }`}
          >
            {index + 1}
          </span>
          <div className="min-w-0">
            <h4 className="text-[17px] font-semibold text-[#14120e]">{step.title}</h4>
            {step.path ? (
              <p className="mt-2 flex flex-wrap items-center gap-1" aria-label={step.path.join(", then ")}>
                {step.path.map((part, partIndex) => (
                  <span key={`${part}-${partIndex}`} className="inline-flex items-center gap-1" aria-hidden="true">
                    {partIndex > 0 ? <ChevronRight className="h-3.5 w-3.5 text-stone-400" /> : null}
                    <span className="rounded-lg border border-[#e4d9c4] bg-[#f6efe2] px-2 py-0.5 text-[13px] font-semibold text-[#3f3a33]">
                      {part}
                    </span>
                  </span>
                ))}
              </p>
            ) : null}
            <p className="mt-2 text-[14.5px] leading-relaxed text-stone-600">{step.text}</p>
            {step.caveat ? (
              <p className="mt-2 rounded-xl border border-[#f1d9a8] bg-[#fff7e6] px-3 py-2 text-[13.5px] leading-relaxed text-[#7c4a03]">
                {step.caveat}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
