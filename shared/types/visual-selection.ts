/**
 * What a curated plan says about each beat's picture — as Studio receives it.
 *
 * ==================== A MIRROR, AND A CHECKED ONE ====================
 * The authoring side of this shape is the agent platform's
 * `src/agents/content/studio-draft.ts`. Two repositories now have to agree
 * about one document, and the way that goes wrong is not a crash: it is a
 * field quietly renamed on one side, read as `undefined` on the other, and a
 * feature that stops working while every test stays green. Phase 3 lost a day
 * to exactly that when Studio exported `"long-form-educational"` and the
 * Director asked for `"long_form_youtube"`.
 *
 * So this module does not merely declare the type. `parseStudioBeatVisual`
 * VALIDATES an arriving document, and `assertPortableAssetId` re-runs the
 * authoring side's own boundary rule here. A document is not trusted because
 * of where it came from — the same principle the render job contract works on.
 *
 * ==================== HONEST ABSENCE ====================
 * Every field that can be unknown is explicitly nullable, and `null` means
 * "nobody knows", never "nothing". A beat with no `previewUrl` has an asset
 * that has not had a thumbnail exported; Studio must name it rather than paint
 * a black frame, because a black frame is indistinguishable from a bug.
 */

/** Bumped by the authoring side when the shape changes meaningfully. */
export const STUDIO_DRAFT_VERSION = 1;

/**
 * How a beat's visual gets made. Mirrors the router's `VisualMode` exactly.
 *
 * `pending_capture` and `pending_generation` are modes, not errors: a draft
 * with three of them is a draft with three KNOWN holes, which is a far more
 * useful thing to hand an editor than one that hides them.
 */
export const VISUAL_MODES = [
  "real_asset",
  "diagram",
  "code_animation",
  "on_screen_text",
  "pending_capture",
  "pending_generation",
] as const;

export type VisualMode = (typeof VISUAL_MODES)[number];

export const VISUAL_MODE_LABEL: Record<VisualMode, string> = {
  real_asset: "Library asset",
  diagram: "Diagram",
  code_animation: "Code animation",
  on_screen_text: "Text card",
  pending_capture: "Needs a capture",
  pending_generation: "Needs generation",
};

/** True for the modes that mean "no visual exists yet". */
export function isPendingMode(mode: VisualMode): boolean {
  return mode === "pending_capture" || mode === "pending_generation";
}

export const VISUAL_PURPOSES = [
  "establish",
  "evidence",
  "explain",
  "contrast",
  "emphasis",
  "resolve",
] as const;
export type VisualPurpose = (typeof VISUAL_PURPOSES)[number];

export const VISUAL_SUBJECTS = [
  "product_ui",
  "trade_work",
  "document",
  "person",
  "concept",
  "data",
] as const;
export type VisualSubject = (typeof VISUAL_SUBJECTS)[number];

export type VisualIntent = {
  readonly purpose: VisualPurpose;
  readonly subject: VisualSubject;
  readonly mustShow: readonly string[];
  readonly mediaPreference: "motion" | "still" | null;
};

export type VisualCandidate = {
  readonly assetId: string;
  /** Application-relative URL, or null when no thumbnail has been exported. */
  readonly previewUrl: string | null;
  /** Rank score. Comparable within one beat, meaningless across beats. */
  readonly score: number;
  readonly description: string | null;
};

export type StudioBeatVisual = {
  readonly mode: VisualMode;
  /** Library-relative id. Null on every non-asset mode. */
  readonly assetId: string | null;
  readonly previewUrl: string | null;
  readonly intent: VisualIntent;
  readonly reason: string;
  /** 0–1. How much to believe the DECISION, not how good the video is. */
  readonly confidence: number;
  readonly candidates: readonly VisualCandidate[];
  readonly warnings: readonly string[];
  /** Set on the pending modes: what would have to be produced. */
  readonly pendingRequirement: string | null;
};

/* ══════════════════════════════════════════════════════════════════════════
 * The boundary, re-checked on arrival
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Anything that is not purely a library-relative id.
 *
 * The authoring side refuses to EMIT one of these. This refuses to READ one,
 * because "the other side already checked" is how both sides end up not
 * checking. It is also the rule that stops a hand-edited or copied draft from
 * turning an asset id into a path traversal when Studio later builds a URL
 * from it.
 */
function pathEscape(id: string): string | null {
  if (id.length === 0) return "is empty";
  if (/^[A-Za-z]:/.test(id)) return "starts with a drive letter";
  if (id.startsWith("/") || id.startsWith("\\")) return "is an absolute path";
  if (id.includes("\\")) return "contains a backslash";
  if (id.split("/").some((segment) => segment === "..")) {
    return "contains a parent-directory segment";
  }
  if (id.includes("file:")) return "contains a file URL";
  return null;
}

export function portableAssetIdProblem(id: string): string | null {
  return pathEscape(id);
}

/**
 * A preview URL Studio is willing to put in an `src`.
 *
 * Must be application-relative and under the library prefix. An absolute URL
 * would let a draft point the operator's browser at any host it liked, which
 * is a thing a document arriving from a file should not be able to do.
 */
export const LIBRARY_PREVIEW_PREFIX = "/studio/library/";

export function isSafePreviewUrl(url: string): boolean {
  if (!url.startsWith(LIBRARY_PREVIEW_PREFIX)) return false;
  if (url.includes("..")) return false;
  return true;
}

/* ══════════════════════════════════════════════════════════════════════════
 * Parsing
 *
 * Every failure is a REASON, never a throw and never a silent drop. A beat
 * whose visual cannot be read still produces a beat — it just produces one
 * that says why it has no picture, which is the whole design principle.
 * ══════════════════════════════════════════════════════════════════════════ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function parseIntent(value: unknown): VisualIntent {
  const record = isRecord(value) ? value : {};
  const purpose = VISUAL_PURPOSES.find((p) => p === record.purpose) ?? "establish";
  const subject = VISUAL_SUBJECTS.find((s) => s === record.subject) ?? "trade_work";
  const media =
    record.mediaPreference === "motion" || record.mediaPreference === "still"
      ? record.mediaPreference
      : null;
  return {
    purpose,
    subject,
    mustShow: strArray(record.mustShow).slice(0, 6),
    mediaPreference: media,
  };
}

function parseCandidate(value: unknown): VisualCandidate | null {
  if (!isRecord(value)) return null;
  const assetId = str(value.assetId);
  if (assetId === null || pathEscape(assetId) !== null) return null;
  const previewUrl = str(value.previewUrl);
  return {
    assetId,
    previewUrl: previewUrl !== null && isSafePreviewUrl(previewUrl) ? previewUrl : null,
    score: typeof value.score === "number" && Number.isFinite(value.score) ? value.score : 0,
    description: str(value.description),
  };
}

export type ParsedVisual = {
  readonly visual: StudioBeatVisual;
  /** Problems found while reading. Shown, never swallowed. */
  readonly problems: readonly string[];
};

/**
 * Read one beat's visual, however damaged.
 *
 * An unreadable visual degrades to `pending_capture` with the problem named —
 * which is exactly what an unreadable visual IS: a beat with no picture and a
 * reason. Returning null instead would make a malformed draft indistinguishable
 * from a plan that predates curation, and those need different answers.
 */
export function parseStudioBeatVisual(value: unknown): ParsedVisual | null {
  if (!isRecord(value)) return null;
  const problems: string[] = [];

  const mode = VISUAL_MODES.find((m) => m === value.mode);
  if (mode === undefined) {
    problems.push(
      `the beat names a visual mode this build does not know (${String(value.mode)})`,
    );
  }

  let assetId = str(value.assetId);
  if (assetId !== null) {
    const problem = pathEscape(assetId);
    if (problem !== null) {
      problems.push(`the asset id ${problem} and was refused`);
      assetId = null;
    }
  }

  let previewUrl = str(value.previewUrl);
  if (previewUrl !== null && !isSafePreviewUrl(previewUrl)) {
    problems.push("the preview URL is not an application-relative library path");
    previewUrl = null;
  }

  const candidates = Array.isArray(value.candidates)
    ? value.candidates
        .map(parseCandidate)
        .filter((entry): entry is VisualCandidate => entry !== null)
    : [];

  const confidence =
    typeof value.confidence === "number" && Number.isFinite(value.confidence)
      ? Math.min(1, Math.max(0, value.confidence))
      : 0;

  // A mode of `real_asset` with no readable asset is a contradiction, and
  // showing it as a library asset would put a blank frame where a picture is
  // claimed. Degrade it to what it actually is.
  const resolved: VisualMode =
    mode === undefined || (mode === "real_asset" && assetId === null)
      ? "pending_capture"
      : mode;
  if (mode === "real_asset" && assetId === null) {
    problems.push("it claims a library asset but names none this build will read");
  }

  return {
    visual: {
      mode: resolved,
      assetId,
      previewUrl,
      intent: parseIntent(value.intent),
      reason: str(value.reason) ?? "no reason was recorded",
      confidence,
      candidates,
      warnings: strArray(value.warnings),
      pendingRequirement: str(value.pendingRequirement),
    },
    problems,
  };
}

/** One line for an inspector. */
export function describeVisualIntent(intent: VisualIntent): string {
  const must =
    intent.mustShow.length > 0 ? ` — must show ${intent.mustShow.join(", ")}` : "";
  const media = intent.mediaPreference === null ? "" : ` (${intent.mediaPreference})`;
  return `${intent.purpose} / ${intent.subject.replace("_", " ")}${media}${must}`;
}

/**
 * How confident a selection is, in words.
 *
 * Bands rather than the raw number, for the same reason the preference set has
 * strength bands: an operator deciding whether to look at a shot is making a
 * three-way choice, and 0.63 does not help them make it.
 */
export function confidenceBand(
  confidence: number,
): "strong" | "worth a look" | "weak" {
  if (confidence >= 0.7) return "strong";
  if (confidence >= 0.5) return "worth a look";
  return "weak";
}

/* ══════════════════════════════════════════════════════════════════════════
 * Preflight — is this draft worth an operator's time?
 * ══════════════════════════════════════════════════════════════════════════ */

export const PREFLIGHT_SEVERITIES = ["blocking", "warning", "note"] as const;
export type PreflightSeverity = (typeof PREFLIGHT_SEVERITIES)[number];

export type PreflightFinding = {
  readonly severity: PreflightSeverity;
  /** Null for a whole-video finding. */
  readonly beatIndex: number | null;
  readonly summary: string;
  /** What to actually do about it. */
  readonly action: string;
};

export type CurationPreflight = {
  /** 0–100. The findings, subtracted from 100 — not a separate opinion. */
  readonly score: number;
  readonly findings: readonly PreflightFinding[];
  /** False when something blocking was found. Not the same as a low score. */
  readonly readyForStudio: boolean;
  readonly counts: {
    readonly beats: number;
    readonly realAssets: number;
    readonly diagrams: number;
    readonly textCards: number;
    readonly pending: number;
    readonly distinctAssets: number;
  };
};

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

/**
 * Read the preflight a curation wrote.
 *
 * Returns null for a plan that was never curated — which is a different fact
 * from a curated plan that scored badly, and the intake says so differently.
 * A finding with no `action` is dropped rather than shown: "consider improving
 * this" is the kind of advice that teaches people to close the panel.
 */
export function parseCurationPreflight(value: unknown): CurationPreflight | null {
  if (!isRecord(value)) return null;
  const raw = isRecord(value.preflight) ? value.preflight : value;
  if (typeof raw.score !== "number" || !Array.isArray(raw.findings)) return null;

  const findings: PreflightFinding[] = [];
  for (const entry of raw.findings) {
    if (!isRecord(entry)) continue;
    const summary = str(entry.summary);
    const action = str(entry.action);
    if (summary === null || action === null) continue;
    findings.push({
      severity:
        PREFLIGHT_SEVERITIES.find((s) => s === entry.severity) ?? "note",
      beatIndex:
        typeof entry.beatIndex === "number" && Number.isFinite(entry.beatIndex)
          ? entry.beatIndex
          : null,
      summary,
      action,
    });
  }

  const counts = isRecord(raw.counts) ? raw.counts : {};
  return {
    score: Math.min(100, Math.max(0, Math.round(raw.score))),
    findings,
    // Trust the authoring side's verdict when it gave one, and derive it
    // otherwise — a draft with a blocking finding is blocked whatever a
    // missing flag says.
    readyForStudio:
      typeof raw.readyForStudio === "boolean"
        ? raw.readyForStudio && !findings.some((f) => f.severity === "blocking")
        : !findings.some((f) => f.severity === "blocking"),
    counts: {
      beats: count(counts.beats),
      realAssets: count(counts.realAssets),
      diagrams: count(counts.diagrams),
      textCards: count(counts.textCards),
      pending: count(counts.pending),
      distinctAssets: count(counts.distinctAssets),
    },
  };
}

/** One line summarising what a curation produced. */
export function describePreflight(preflight: CurationPreflight): string {
  const c = preflight.counts;
  const parts = [`${c.realAssets} library ${c.realAssets === 1 ? "asset" : "assets"}`];
  if (c.diagrams > 0) parts.push(`${c.diagrams} ${c.diagrams === 1 ? "diagram" : "diagrams"}`);
  if (c.textCards > 0) parts.push(`${c.textCards} text ${c.textCards === 1 ? "card" : "cards"}`);
  if (c.pending > 0) parts.push(`${c.pending} still to produce`);
  return `${preflight.score}/100 — ${parts.join(", ")}`;
}
