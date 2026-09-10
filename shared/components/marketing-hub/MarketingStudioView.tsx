"use client";

import { useState } from "react";
import Link from "next/link";
import { StudioLearningPanel } from "./StudioLearningPanel";
import {
  Button,
  StatusPill,
  altairMcCardClass,
  altairMcCardPadClass,
} from "@/shared/design-system/components";
import {
  HVAC_CATEGORIES,
  HVAC_EPISODES,
  HVAC_FRAME,
  HVAC_SERIES_NAME,
  HVAC_STYLE_LOCK,
  HVAC_STYLE_LOCK_PILL_RULE,
  HVAC_TOTAL_TARGET_STILLS,
  buildHvacEpisodeScaffold,
  buildHvacRunCommand,
  hvacEpisodeFileName,
  hvacVisualPlanFileName,
  type HvacEpisode,
} from "@/shared/types/hvac-studio";

/**
 * Studio — where the next episode is decided, not where it is rendered.
 *
 * ==================== WHAT THIS TAB IS FOR ====================
 * The slide system on the production laptop renders episodes from two files:
 * an `episode-*.json` and its visual plan. It has never had a place to answer
 * "which episode is next, what is it called, and what is the frame contract" —
 * that lived in a chat log. This tab is that place, and its output is the
 * exact text those files start from.
 *
 * ==================== WHY IT RENDERS NOTHING AND READS NOTHING ====================
 * No server action, no query, no new table. Everything on screen is either the
 * committed blueprint in `shared/types/hvac-studio.ts` or a string derived
 * from it, which is why this tab adds no authorization surface: it inherits
 * `/marketing`'s platform-operator gate and needs nothing of its own.
 *
 * It also deliberately does NOT show renders. Render jobs, their ids and their
 * stored media already have one home under Publishing, and the rule this
 * workspace is organised by is one home per capability. A second render list
 * here would be the same rows under a different name, drifting the moment one
 * of the two was updated.
 *
 * ==================== NO PROGRESS BARS ====================
 * There is no "20 of 95 captured" anywhere below, because this application
 * cannot see the asset library — it is a librarian-indexed tree on the laptop
 * under `ALTAIR_ASSET_LIBRARY_ROOT`. Targets are labelled as targets and the
 * absence of a measurement is stated rather than filled in.
 */

type CopyKey = "scaffold" | "command";
type CopyStatus = "idle" | "copied" | "failed";

function useCopy() {
  const [state, setState] = useState<{ key: CopyKey | null; status: CopyStatus }>(
    { key: null, status: "idle" },
  );

  async function copy(key: CopyKey, text: string) {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(text);
      setState({ key, status: "copied" });
      window.setTimeout(() => setState({ key: null, status: "idle" }), 2000);
    } catch {
      setState({ key, status: "failed" });
      window.setTimeout(() => setState({ key: null, status: "idle" }), 2500);
    }
  }

  function labelFor(key: CopyKey, idle: string) {
    if (state.key !== key) return idle;
    if (state.status === "copied") return "Copied";
    if (state.status === "failed") return "Copy failed";
    return idle;
  }

  return { copy, labelFor };
}

function CategoryRow({
  label,
  scope,
  targetStills,
  required,
}: {
  readonly label: string;
  readonly scope: string;
  readonly targetStills: number;
  readonly required: boolean;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-t border-[var(--north-star-plate-border)] px-3.5 py-2.5 first:border-t-0">
      <div className="min-w-0">
        <span className="block text-sm font-medium text-altair-ink">
          {label}
        </span>
        <span className="block text-xs text-altair-ink-muted">{scope}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {required ? (
          <StatusPill tone="info" size="sm">
            Needed for this episode
          </StatusPill>
        ) : null}
        <span className="text-xs text-altair-ink-muted">
          {targetStills} planned
        </span>
      </div>
    </li>
  );
}

export function MarketingStudioView() {
  const [episodeNumber, setEpisodeNumber] = useState<number>(
    HVAC_EPISODES[0].number,
  );
  const { copy, labelFor } = useCopy();

  const episode: HvacEpisode =
    HVAC_EPISODES.find((entry) => entry.number === episodeNumber) ??
    HVAC_EPISODES[0];

  const scaffold = JSON.stringify(buildHvacEpisodeScaffold(episode), null, 2);
  const command = buildHvacRunCommand(episode);

  return (
    <div className="space-y-4">
      <section className={`${altairMcCardClass} ${altairMcCardPadClass}`}>
        <h2 className="text-sm font-semibold text-altair-ink">
          {HVAC_SERIES_NAME}
        </h2>
        <p className="mt-1 text-xs text-altair-ink-muted">
          The episode plan and the locked frame contract for the HVAC education
          series. Rendering happens on the production laptop from the slide
          system; this tab decides what it renders and hands you the files to
          start from.
        </p>
      </section>

      {/* ── Style lock ────────────────────────────────────────────────── */}
      <section className={altairMcCardClass}>
        <div className={altairMcCardPadClass}>
          <h3 className="text-sm font-semibold text-altair-ink">Style lock</h3>
          <p className="mt-1 text-xs text-altair-ink-muted">
            Refrigerant state is read by colour, in-frame, in every episode. The
            point of locking it is that a viewer stops re-learning the legend at
            episode four.
          </p>
        </div>
        <ul>
          {HVAC_STYLE_LOCK.map((state) => (
            <li
              key={state.label}
              className="flex flex-wrap items-start gap-3 border-t border-[var(--north-star-plate-border)] px-3.5 py-2.5"
            >
              {/* Inline style, not a Tailwind utility: these are video-frame
                  hues and must not enter the product stylesheet. See the
                  header of shared/types/hvac-studio.ts. */}
              <span
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 rounded-full ring-1 ring-[var(--north-star-plate-border)]"
                style={{ backgroundColor: state.hex }}
              />
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-altair-ink">
                  {state.label}{" "}
                  <span className="font-normal text-altair-ink-muted">
                    {state.hex}
                  </span>
                </span>
                <span className="block text-xs text-altair-ink-muted">
                  {state.where}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="border-t border-[var(--north-star-plate-border)] px-3.5 py-2.5 text-xs text-altair-ink-muted">
          {HVAC_STYLE_LOCK_PILL_RULE}
        </p>
      </section>

      {/* ── Episode blueprint ─────────────────────────────────────────── */}
      <section className={altairMcCardClass}>
        <div className={altairMcCardPadClass}>
          <h3 className="text-sm font-semibold text-altair-ink">
            Episode blueprint
          </h3>
          <p className="mt-1 text-xs text-altair-ink-muted">
            {HVAC_EPISODES.length} episodes planned. Pick one to get its file
            names and its run.
          </p>
        </div>
        <ul>
          {HVAC_EPISODES.map((entry) => {
            const selected = entry.number === episode.number;
            return (
              <li key={entry.number}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setEpisodeNumber(entry.number)}
                  className={`flex w-full items-start gap-3 border-t border-[var(--north-star-plate-border)] px-3.5 py-2.5 text-left ${
                    selected
                      ? "bg-altair-paper-subtle ring-1 ring-inset ring-altair-brass"
                      : "hover:bg-altair-paper-subtle"
                  }`}
                >
                  <span className="w-8 shrink-0 pt-0.5 text-xs tabular-nums text-altair-ink-muted">
                    EP{String(entry.number).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-altair-ink">
                      {entry.title}
                    </span>
                    <span className="block text-xs text-altair-ink-muted">
                      {entry.teaches}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── The selected episode's files ──────────────────────────────── */}
      <section className={altairMcCardClass}>
        <div className={altairMcCardPadClass}>
          <h3 className="text-sm font-semibold text-altair-ink">
            EP{String(episode.number).padStart(2, "0")} — {episode.title}
          </h3>
          <p className="mt-1 text-xs text-altair-ink-muted">
            {HVAC_FRAME.widthPx}×{HVAC_FRAME.heightPx} at {HVAC_FRAME.fps} fps.
            Two files in{" "}
            <code className="font-mono text-[11px]">
              production/slide-system/
            </code>
            : <code className="font-mono text-[11px]">
              {hvacEpisodeFileName(episode.number)}
            </code>{" "}
            and{" "}
            <code className="font-mono text-[11px]">
              {hvacVisualPlanFileName(episode.number)}
            </code>
            .
          </p>
        </div>

        {/* The editor exists for exactly one episode so far — the one that has
            actually been rendered. Offering the link on every episode would
            promise a project that does not exist. */}
        {episode.number === 1 ? (
          <div className="border-t border-[var(--north-star-plate-border)] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-altair-ink">
                  Open in the editor
                </h4>
                <p className="mt-0.5 text-xs text-altair-ink-muted">
                  This episode has been rendered, so its timeline carries
                  measured narration timings and real frames.
                </p>
              </div>
              <Link
                href="/studio/editor/hvac-01"
                className="shrink-0 rounded-[var(--radius-card)] bg-altair-graphite px-3 py-1.5 text-xs font-medium text-altair-ink-on-graphite"
              >
                Open editor
              </Link>
            </div>
          </div>
        ) : null}

        <div className="border-t border-[var(--north-star-plate-border)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-altair-ink">
              Episode file
            </h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void copy("scaffold", scaffold)}
            >
              {labelFor("scaffold", "Copy episode JSON")}
            </Button>
          </div>
          <p className="mt-1 text-xs text-altair-ink-muted">
            <code className="font-mono text-[11px]">beats</code> is empty on
            purpose. Beats are narration, and narration comes from the written
            script through{" "}
            <code className="font-mono text-[11px]">script-to-episode.mjs</code>
            . A render stops on a beat with no voiceover, so a scaffold nobody
            filled in cannot quietly produce a silent video.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--north-star-plate-border)] bg-altair-paper-subtle p-3 font-mono text-[11px] leading-relaxed text-altair-ink-secondary">
            {scaffold}
          </pre>
        </div>

        <div className="border-t border-[var(--north-star-plate-border)] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-altair-ink">
              Run it, on the laptop
            </h4>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void copy("command", command)}
            >
              {labelFor("command", "Copy run")}
            </Button>
          </div>
          <pre className="mt-2 overflow-x-auto rounded-[var(--radius-card)] border border-[var(--north-star-plate-border)] bg-altair-paper-subtle p-3 font-mono text-[11px] leading-relaxed text-altair-ink-secondary">
            {command}
          </pre>
        </div>
      </section>

      {/* ── Learned from edits ────────────────────────────────────────── */}
      <StudioLearningPanel />

      {/* ── Capture plan ──────────────────────────────────────────────── */}
      <section className={altairMcCardClass}>
        <div className={altairMcCardPadClass}>
          <h3 className="text-sm font-semibold text-altair-ink">
            Capture plan
          </h3>
          <p className="mt-1 text-xs text-altair-ink-muted">
            {HVAC_TOTAL_TARGET_STILLS} stills planned across{" "}
            {HVAC_CATEGORIES.length} categories, in capture order. These are
            targets. This page is not counting what has been shot — the asset
            library is a librarian-indexed tree on the production laptop under{" "}
            <code className="font-mono text-[11px]">
              ALTAIR_ASSET_LIBRARY_ROOT
            </code>
            , and nothing in this application can read it.
          </p>
        </div>
        <ul>
          {HVAC_CATEGORIES.map((category) => (
            <CategoryRow
              key={category.id}
              label={category.label}
              scope={category.scope}
              targetStills={category.targetStills}
              required={episode.needsCategories.includes(category.id)}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}
