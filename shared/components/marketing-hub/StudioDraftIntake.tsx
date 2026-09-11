"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  altairMcCardClass,
  altairMcCardPadClass,
  Button,
  StatusPill,
} from "@/shared/design-system/components";
import {
  buildDraftFromPlan,
  type GeneratedDraft,
  describeDraftOrigin,
  type VideoPlanArtifact,
} from "@/shared/lib/video-editor/draft-from-plan";
import {
  deleteDraft,
  loadDrafts,
  saveDraft,
  type StoredDraft,
} from "@/shared/lib/video-editor/draft-store";
import { buildPreferenceSetFile } from "@/shared/lib/video-editor/preference-set";
import { loadSessions } from "@/shared/lib/video-editor/session";
import { HVAC_SERIES_NAME } from "@/shared/types/hvac-studio";
import { AGENT_FORMATS } from "@/shared/types/editing-preferences";
import {
  describePreflight,
  type CurationPreflight,
} from "@/shared/types/visual-selection";

/**
 * Where an agent's plan becomes an editable draft, and where the evidence
 * goes back the other way.
 *
 * ==================== THE TWO HALVES OF THE LOOP, IN ONE PANEL ====================
 * Down: a `content.video_plan` from the Director becomes an `EditorProject`
 * with the production pacing rule already applied, stored, and openable.
 * Up: everything the operator has approved becomes a preference file the
 * Director reads on its next run.
 *
 * Both directions are files today. Sessions and drafts live in this browser, so
 * there is no server-side store for an endpoint to read — and a file is what
 * this system already uses to cross exactly this boundary (episode JSON, visual
 * plans, timeline exports). When those move to a table, this panel becomes two
 * buttons that call it instead of two that move JSON.
 *
 * ==================== NOTHING HERE PUBLISHES ====================
 * Importing a plan creates a draft. Approving it in the editor records
 * evidence. Neither renders and neither publishes; those stay separate actions
 * behind their own controls.
 */

const PLAN_PLACEHOLDER = `{
  "topic": "How the HVAC cycle works",
  "format": "long-form-educational",
  "hook": "Cold air is not made. It is moved.",
  "beats": [
    { "narration": "...", "visualDirection": "...", "caption": "...", "kind": "diagram_graphic" }
  ]
}`;

type Status =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "ok"; message: string };

/**
 * What an operator needs to know before deciding whether to open a draft.
 *
 * The visual counts come first because they are the thing that changed: a
 * pre-curation draft arrived with narration and timing over an empty visual
 * layer, and nothing on this card said so. "6 beats, 48.2s" was true of both a
 * draft with six real shots and a draft with none.
 *
 * A draft with no curation at all says that plainly rather than reporting zero
 * assets, because those are different facts: one plan was never curated, the
 * other was curated and found nothing.
 */
function describeImportedDraft(draft: GeneratedDraft): string {
  const timing = `${draft.summary.beats} beats, ${(draft.summary.expectedMasterMs / 1000).toFixed(1)}s after crossfades`;
  const curated = draft.summary.beatsWithAsset + draft.summary.beatsPending > 0;
  if (!curated) {
    return `Draft ready — ${timing}. This plan carries no curated visuals, so every clip is a description rather than a shot.`;
  }
  const gaps =
    draft.summary.beatsPending > 0
      ? `, ${draft.summary.beatsPending} still to produce`
      : "";
  const problems =
    draft.summary.visualProblems.length > 0
      ? ` ${draft.summary.visualProblems.length} visual${draft.summary.visualProblems.length === 1 ? "" : "s"} could not be read: ${draft.summary.visualProblems[0] ?? ""}`
      : "";
  return `Draft ready — ${timing}. ${draft.summary.beatsWithAsset} of ${draft.summary.beats} beats arrived with a real library asset${gaps}.${problems}`;
}

/**
 * The curation's own verdict, where the decision to open a draft is made.
 *
 * ==================== A SCORE NOBODY CAN TAKE APART IS A NUMBER ====================
 * The score is shown WITH its findings, never alone, because "64/100" invites
 * exactly one response — argue with the number — while "beat 1 has no visual;
 * here is what would have to be filmed" invites the useful one. Every finding
 * carries an action for the same reason: the preflight that gets ignored is the
 * one that says a draft is imperfect without saying what to do about it.
 *
 * Absent for a plan nothing curated. Reporting 0/100 there would be a judgment
 * on a plan nobody judged.
 */
function Preflight({ preflight }: { readonly preflight: CurationPreflight | null }) {
  const [open, setOpen] = useState(false);
  if (preflight === null) return null;

  const tone = !preflight.readyForStudio
    ? "text-altair-danger"
    : preflight.score >= 85
      ? "text-altair-ink"
      : "text-altair-ink-muted";

  return (
    <div className="mt-1" data-testid="studio-preflight">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 text-[11px] underline decoration-dotted"
      >
        <span className={`font-medium ${tone}`}>
          Preflight {describePreflight(preflight)}
        </span>
        {preflight.findings.length > 0 ? (
          <span className="text-altair-ink-muted">
            · {preflight.findings.length}{" "}
            {preflight.findings.length === 1 ? "finding" : "findings"}
            {open ? " ▴" : " ▾"}
          </span>
        ) : null}
      </button>

      {!preflight.readyForStudio ? (
        <span className="mt-0.5 block text-[11px] text-altair-danger">
          Blocked — this draft is asking for a library we do not have.
        </span>
      ) : null}

      {open && preflight.findings.length > 0 ? (
        <ul className="mt-1.5 space-y-1.5">
          {preflight.findings.map((finding, index) => (
            <li
              key={`${finding.severity}-${String(finding.beatIndex)}-${String(index)}`}
              className="text-[11px] leading-relaxed"
            >
              <span className="font-medium text-altair-ink">
                {finding.beatIndex === null
                  ? "Whole video"
                  : `Beat ${finding.beatIndex + 1}`}
                : {finding.summary}
              </span>
              <span className="block text-altair-ink-muted">{finding.action}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function StudioDraftIntake() {
  const [drafts, setDrafts] = useState<StoredDraft[]>([]);
  const [planText, setPlanText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preferenceSummary, setPreferenceSummary] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setDrafts(loadDrafts());
  }, []);

  function handleImport() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(planText);
    } catch {
      setStatus({ kind: "error", message: "That is not valid JSON." });
      return;
    }

    const plan = parsed as Partial<VideoPlanArtifact>;
    // Validated by hand rather than with a schema library because the failure
    // an operator hits is "I pasted the wrong thing", and a field-by-field
    // message is more use to them than a parser trace.
    if (typeof plan.topic !== "string" || plan.topic.trim() === "") {
      setStatus({ kind: "error", message: "The plan has no `topic`." });
      return;
    }
    if (!Array.isArray(plan.beats) || plan.beats.length === 0) {
      setStatus({ kind: "error", message: "The plan has no `beats`." });
      return;
    }
    const badBeat = plan.beats.findIndex(
      (b) => typeof b?.narration !== "string" || typeof b?.visualDirection !== "string",
    );
    if (badBeat >= 0) {
      setStatus({
        kind: "error",
        message: `Beat ${badBeat + 1} is missing narration or visualDirection.`,
      });
      return;
    }

    const generatedAt = new Date().toISOString();
    const draft = buildDraftFromPlan(
      {
        topic: plan.topic,
        format: plan.format ?? AGENT_FORMATS.longFormYoutube,
        hook: plan.hook ?? "",
        beats: plan.beats,
        curation: (parsed as { curation?: unknown }).curation,
        cta: plan.cta,
        targetDurationSeconds: plan.targetDurationSeconds,
        series: plan.series,
      },
      {
        // Recorded from the plan when the Director stamped it; otherwise the
        // import itself is named, so a hand-pasted draft is never mistaken for
        // agent output in the evidence.
        agentVersion:
          (parsed as { generatedWith?: { agentVersion?: string } })
            .generatedWith?.agentVersion ?? "studio-import",
        generatedAt,
        preferenceSetVersion:
          (parsed as { generatedWith?: { preferenceSetVersion?: number | null } })
            .generatedWith?.preferenceSetVersion ?? undefined,
        preferenceKeysSupplied:
          (parsed as { generatedWith?: { preferenceKeysSupplied?: string[] } })
            .generatedWith?.preferenceKeysSupplied ?? undefined,
      },
    );

    const saved = saveDraft(draft, generatedAt);
    setDrafts(loadDrafts());
    setPlanText("");
    setStatus({
      kind: saved ? "ok" : "error",
      message: saved
        ? describeImportedDraft(draft)
        : "This browser blocked local storage, so the draft was not kept.",
    });
  }

  function handleExportPreferences() {
    const sessions = loadSessions();
    const file = buildPreferenceSetFile(sessions, {
      series: HVAC_SERIES_NAME,
      format: "long-form-educational",
      generatedAt: new Date().toISOString(),
    });

    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "editing-preferences.json";
    anchor.click();
    URL.revokeObjectURL(url);

    setPreferenceSummary(
      file.guidance === null
        ? `Exported — nothing has cleared ${file.provenance.thresholds.minSessions} sessions and ${Math.round(file.provenance.thresholds.minConfidence * 100)}% confidence yet, so the Director will plan exactly as it does today.`
        : `Exported — ${file.suppliedKeys.length} preference${file.suppliedKeys.length === 1 ? "" : "s"} from ${file.provenance.approvedSessions} approved session${file.provenance.approvedSessions === 1 ? "" : "s"}.`,
    );
  }

  return (
    <section className={altairMcCardClass}>
      <div className={altairMcCardPadClass}>
        <h3 className="text-sm font-semibold text-altair-ink">
          Agent drafts and learned preferences
        </h3>
        <p className="mt-1 text-xs text-altair-ink-muted">
          The two directions of the learning loop. A Director plan becomes an
          editable draft here; everything you have approved becomes the
          preference file the Director reads on its next run.
        </p>
      </div>

      {/* ── Down: plan → draft ──────────────────────────────────────────── */}
      <div className="border-t border-[var(--north-star-plate-border)] p-3.5">
        <h4 className="text-xs font-semibold text-altair-ink">
          Open a generated plan
        </h4>
        <p className="mt-1 text-xs text-altair-ink-muted">
          Paste a <code className="font-mono text-[11px]">content.video_plan</code>{" "}
          artifact. Beat durations come from the production pacing rule, not
          from the plan — the Director does not choose them.
        </p>
        <textarea
          value={planText}
          onChange={(event) => setPlanText(event.target.value)}
          rows={6}
          placeholder={PLAN_PLACEHOLDER}
          className="mt-2 w-full resize-y rounded-[var(--radius-card)] border border-[var(--north-star-plate-border)] bg-altair-paper-subtle p-2 font-mono text-[11px] leading-relaxed text-altair-ink"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleImport}
            disabled={planText.trim() === ""}
          >
            Create draft
          </Button>
          {status.kind !== "idle" ? (
            <span
              className={`text-xs ${status.kind === "error" ? "text-altair-danger" : "text-altair-ink-muted"}`}
            >
              {status.message}
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Drafts waiting ──────────────────────────────────────────────── */}
      {drafts.length > 0 ? (
        <ul>
          {drafts.map((draft) => (
            <li
              key={draft.project.id}
              className="flex flex-wrap items-start justify-between gap-2 border-t border-[var(--north-star-plate-border)] px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-altair-ink">
                  {draft.project.title}
                </span>
                <span className="block text-xs text-altair-ink-muted">
                  {describeDraftOrigin(draft.metadata)}
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-altair-ink-muted">
                  {draft.summary.beatsWithAsset > 0 ||
                  draft.summary.beatsPending > 0 ? (
                    <span title="Beats that arrived with a real library asset">
                      {draft.summary.beatsWithAsset}/{draft.summary.beats} shots
                      ·{" "}
                    </span>
                  ) : null}
                  {draft.summary.beats} beats ·{" "}
                  {(draft.summary.expectedMasterMs / 1000).toFixed(1)}s ·{" "}
                  {draft.summary.durationsEstimated
                    ? "durations estimated"
                    : "durations measured"}
                </span>
                <Preflight preflight={draft.summary.preflight ?? null} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill tone="info" size="sm">
                  Generated draft
                </StatusPill>
                <Link
                  href={`/studio/editor/${draft.project.id}`}
                  data-testid="ve-open-draft"
                  className="rounded-[var(--radius-card)] bg-altair-graphite px-3 py-1.5 text-xs font-medium text-altair-ink-on-graphite"
                >
                  Open draft
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    deleteDraft(draft.project.id);
                    setDrafts(loadDrafts());
                  }}
                  className="text-xs text-altair-ink-muted underline"
                >
                  Discard
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {/* ── Up: evidence → preferences ──────────────────────────────────── */}
      <div className="border-t border-[var(--north-star-plate-border)] p-3.5">
        <h4 className="text-xs font-semibold text-altair-ink">
          Export learned preferences
        </h4>
        <p className="mt-1 text-xs text-altair-ink-muted">
          Writes{" "}
          <code className="font-mono text-[11px]">editing-preferences.json</code>
          . Point the agent platform at it with{" "}
          <code className="font-mono text-[11px]">ALTAIR_EDITING_PREFERENCES</code>{" "}
          and the Director reads it on its next planning run. Only preferences
          that cleared both thresholds are included.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleExportPreferences}
          >
            Export preference set
          </Button>
          {preferenceSummary ? (
            <span className="text-xs text-altair-ink-muted">
              {preferenceSummary}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
