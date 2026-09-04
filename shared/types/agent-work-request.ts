/**
 * The closed vocabulary of work an operator may request from the Chief.
 *
 * ============ TWO WAYS TO ASK, ONE QUEUE, ONE RULE ============
 * The original two kinds are PARAMETERLESS buttons (`OPERATOR_BUTTON_KINDS`):
 * a button can name an analysis but must not invent a topic. The newer kinds
 * carry typed `params` and are queued by the CHIEF from the operator's own
 * chat message — the platform's `chief:respond` interprets the sentence,
 * validates the shape, and enqueues here with a deterministic per-question
 * request key. Either way the KIND is a closed enum, params are validated on
 * enqueue AND re-validated by the platform before running, and there is no
 * free-text command anywhere in this path.
 *
 * ============ REQUESTING IS NOT RUNNING, CREATING IS NOT PUBLISHING ============
 * A request records that a human asked. The platform decides whether anything
 * happens, and each runner keeps its own consent gate — so a request whose
 * gate is off comes back `refused`, having spent nothing. Every parameterized
 * kind STAGES drafts for review; none of them publishes, uploads or posts.
 */

export const WORK_REQUEST_KINDS = [
  "performance_review",
  "finance_report",
  "research_topic",
  "director_plan",
  "create_video",
  "youtube_draft",
  "seo_draft",
  "content_campaign",
  "schedule_mutation",
] as const;

export type WorkRequestKind = (typeof WORK_REQUEST_KINDS)[number];

/** The parameterless kinds that render as one-click buttons. */
export const OPERATOR_BUTTON_KINDS = [
  "performance_review",
  "finance_report",
] as const satisfies readonly WorkRequestKind[];

export const CONTENT_FORMATS = [
  "diagram_explainer",
  "screen_recording",
  "short_narrated_video",
  "founder_on_camera",
  "long_form_youtube",
  "seo_article",
  "social_only",
] as const;

export const CAMPAIGN_OUTPUTS = [
  "youtube_long",
  "short_videos",
  "seo_article",
  "social_posts",
  "diagram_explainer",
] as const;

export const PLATFORM_TARGETS = [
  "facebook",
  "instagram",
  "youtube",
  "website",
] as const;

export type WorkRequestDescriptor = {
  readonly kind: WorkRequestKind;
  /** What the operator is asking for, in their language. */
  readonly label: string;
  /** What it actually does, and what it costs them. */
  readonly detail: string;
  /**
   * The platform consent gate that must be enabled for it to run.
   *
   * Named here only so the surface can explain a refusal honestly. Altair OS
   * cannot read or set it: it lives in the platform's own environment, which
   * is exactly why it is a real second consent rather than a label.
   */
  readonly platformGate: string;
};

export const WORK_REQUEST_DESCRIPTORS: Readonly<
  Record<WorkRequestKind, WorkRequestDescriptor>
> = {
  performance_review: {
    kind: "performance_review",
    label: "Review content performance",
    detail:
      "Reads how published posts actually performed and matches them to the experiments that produced them. Read-only — it publishes nothing.",
    platformGate: "RUN_CONTENT_PERFORMANCE",
  },
  finance_report: {
    kind: "finance_report",
    label: "Review model spend",
    detail:
      "Totals what the agents have spent against the configured budgets. Read-only — it changes no budget and moves no money.",
    platformGate: "RUN_FINANCE_REPORT",
  },
  research_topic: {
    kind: "research_topic",
    label: "Research a topic",
    detail:
      "Stages a topic research report the Director and drafts can build on. Internal only — it publishes nothing.",
    platformGate: "RUN_RESEARCH_TOPIC",
  },
  director_plan: {
    kind: "director_plan",
    label: "Director format decision",
    detail:
      "The Director decides the strongest format for an idea (diagram, video, article, founder voice…). A recommendation — it produces or publishes nothing.",
    platformGate: "RUN_DIRECTOR_FORMAT",
  },
  create_video: {
    kind: "create_video",
    label: "Create a video plan",
    detail:
      "Stages a video plan or explainer draft (the Director picks the format unless one was named). A DRAFT — nothing is rendered or posted.",
    platformGate: "RUN_CREATE_VIDEO",
  },
  youtube_draft: {
    kind: "youtube_draft",
    label: "Draft a YouTube script",
    detail:
      "Stages a long-form YouTube script draft with sections and visual direction. A DRAFT — nothing is uploaded.",
    platformGate: "RUN_YOUTUBE_DRAFT",
  },
  seo_draft: {
    kind: "seo_draft",
    label: "Draft an SEO article",
    detail:
      "Stages a complete SEO article draft with its meta/SEO envelope. A DRAFT — no page is published.",
    platformGate: "RUN_SEO_DRAFT",
  },
  content_campaign: {
    kind: "content_campaign",
    label: "Run a content campaign",
    detail:
      "Researches once, asks the Director for a strategy, then stages the requested drafts sharing that research. All DRAFTS — nothing is published.",
    platformGate: "RUN_CONTENT_CAMPAIGN",
  },
  schedule_mutation: {
    kind: "schedule_mutation",
    label: "Change the content schedule",
    detail:
      "Interprets one instruction (“increase Facebook to three posts a day”, “pause video until Friday”) and updates the Chief's standing production cadence, focus theme, pause state or autonomous render limits. Every numeric ceiling is enforced by the platform after the call — an instruction that would exceed one is refused, nothing changes, and no post is created or published.",
    platformGate: "RUN_CONTENT_GOALS_MUTATION",
  },
};

/**
 * `failed` is deliberately distinct from `refused`: a run that broke and a
 * run that was never allowed to start are different facts about the system,
 * and collapsing them would hide one of them from the operator.
 */
export type WorkRequestOutcome = "completed" | "refused" | "failed";

export type WorkRequest = {
  readonly id: string;
  readonly kind: WorkRequestKind;
  readonly requestKey: string;
  readonly params: Readonly<Record<string, unknown>> | null;
  readonly note: string | null;
  readonly requestedByEmail: string | null;
  readonly requestedAt: string;
  readonly appliedAt: string | null;
  readonly outcome: WorkRequestOutcome | null;
  readonly outcomeDetail: string | null;
};

export const WORK_REQUEST_NOTE_MAX = 500;

export function isWorkRequestKind(value: unknown): value is WorkRequestKind {
  return (
    typeof value === "string" &&
    (WORK_REQUEST_KINDS as readonly string[]).includes(value)
  );
}

/* ------------------------------------------------ params validation */

type FieldSpec =
  | { readonly type: "string"; readonly min: number; readonly max: number }
  | { readonly type: "enum"; readonly values: readonly string[] }
  | { readonly type: "int"; readonly min: number; readonly max: number }
  | {
      readonly type: "enum_array";
      readonly values: readonly string[];
      readonly min: number;
      readonly max: number;
    };

type ParamsSpec = Readonly<
  Record<string, FieldSpec & { readonly required?: boolean }>
>;

const topicField = { type: "string", min: 3, max: 300 } as const;
const shortText = { type: "string", min: 1, max: 300 } as const;
const longText = { type: "string", min: 1, max: 500 } as const;
const artifactRef = { type: "string", min: 1, max: 80 } as const;

/**
 * Per-kind params shapes — the SAME contract the platform's
 * `work-request-params.ts` enforces with zod. Both sides refusing on the
 * same shape is what keeps this queue from hiding malformed work.
 * `null` = the kind takes no params at all.
 */
const PARAMS_SPECS: Readonly<Record<WorkRequestKind, ParamsSpec | null>> = {
  performance_review: null,
  finance_report: null,
  research_topic: {
    topic: { ...topicField, required: true },
    question: longText,
    objective: shortText,
  },
  director_plan: {
    topic: topicField,
    sourceArtifactId: artifactRef,
    request: longText,
  },
  create_video: {
    topic: { ...topicField, required: true },
    objective: shortText,
    audience: shortText,
    format: { type: "enum", values: CONTENT_FORMATS },
    platform: { type: "enum", values: PLATFORM_TARGETS },
    durationSeconds: { type: "int", min: 5, max: 1200 },
    sourceArtifactId: artifactRef,
  },
  youtube_draft: {
    topic: { ...topicField, required: true },
    audience: shortText,
    objective: shortText,
    sourceArtifactId: artifactRef,
  },
  seo_draft: {
    topic: { ...topicField, required: true },
    primaryKeyword: { type: "string", min: 2, max: 120 },
    objective: shortText,
    sourceArtifactId: artifactRef,
  },
  content_campaign: {
    topic: { ...topicField, required: true },
    objective: shortText,
    audience: shortText,
    outputs: {
      type: "enum_array",
      values: CAMPAIGN_OUTPUTS,
      min: 1,
      max: CAMPAIGN_OUTPUTS.length,
      required: true,
    },
    shortCount: { type: "int", min: 1, max: 3 },
  },
  schedule_mutation: {
    instruction: { ...longText, required: true },
  },
};

// director_plan additionally needs at least one of topic/sourceArtifactId;
// campaign params may carry a sourceArtifactId too.
const CAMPAIGN_EXTRA: ParamsSpec = { sourceArtifactId: artifactRef };

function checkField(spec: FieldSpec, value: unknown): boolean {
  switch (spec.type) {
    case "string":
      return (
        typeof value === "string" &&
        value.trim().length >= spec.min &&
        value.length <= spec.max
      );
    case "enum":
      return typeof value === "string" && spec.values.includes(value);
    case "int":
      return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= spec.min &&
        value <= spec.max
      );
    case "enum_array":
      return (
        Array.isArray(value) &&
        value.length >= spec.min &&
        value.length <= spec.max &&
        value.every(
          (entry) => typeof entry === "string" && spec.values.includes(entry),
        ) &&
        new Set(value).size === value.length
      );
  }
}

export type ParamsValidation =
  | {
      readonly ok: true;
      readonly params: Readonly<Record<string, unknown>> | null;
    }
  | { readonly ok: false; readonly error: string };

/**
 * Validate params for one kind, fail-closed and strict: unknown keys are
 * refused (someone is smuggling), required keys must be present, and a
 * parameterless kind must carry none.
 */
export function validateWorkRequestParams(
  kind: WorkRequestKind,
  raw: unknown,
): ParamsValidation {
  const spec = PARAMS_SPECS[kind];

  if (spec === null) {
    if (raw === undefined || raw === null) return { ok: true, params: null };
    return { ok: false, error: `${kind} takes no parameters.` };
  }

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: `${kind} requires a parameters object.` };
  }

  const effectiveSpec: ParamsSpec =
    kind === "content_campaign" ? { ...spec, ...CAMPAIGN_EXTRA } : spec;

  const value = raw as Record<string, unknown>;
  for (const key of Object.keys(value)) {
    if (!(key in effectiveSpec)) {
      return {
        ok: false,
        error: `${kind} does not take a "${key}" parameter.`,
      };
    }
  }
  for (const [key, field] of Object.entries(effectiveSpec)) {
    const present = value[key] !== undefined && value[key] !== null;
    if (!present) {
      if (field.required === true) {
        return { ok: false, error: `${kind} requires "${key}".` };
      }
      continue;
    }
    if (!checkField(field, value[key])) {
      return { ok: false, error: `${kind} parameter "${key}" is invalid.` };
    }
  }

  if (
    kind === "director_plan" &&
    value.topic === undefined &&
    value.sourceArtifactId === undefined
  ) {
    return {
      ok: false,
      error: "director_plan needs a topic or a source artifact.",
    };
  }

  // Strip anything null/undefined so what is stored is exactly what was
  // validated.
  const params: Record<string, unknown> = {};
  for (const key of Object.keys(effectiveSpec)) {
    if (value[key] !== undefined && value[key] !== null)
      params[key] = value[key];
  }
  return { ok: true, params: Object.keys(params).length === 0 ? null : params };
}

/* ------------------------------------------------ chief-command grouping */

const CHIEF_COMMAND_KEY_PATTERN = /^chief-cmd:([^:]+):\d+-[a-z_]+$/;

/**
 * The conversation question a request was queued FROM, when the Chief queued
 * it (`chief-cmd:<questionId>:<n>-<kind>`), or null for button requests.
 * This is how the Command surface attaches real request state under the
 * Chief's answer bubble — derived from rows, never simulated.
 */
export function chiefCommandQuestionId(requestKey: string): string | null {
  const match = CHIEF_COMMAND_KEY_PATTERN.exec(requestKey);
  return match ? (match[1] ?? null) : null;
}

/** A short human name for one request, topic included when it carries one. */
export function workRequestDisplayLabel(request: WorkRequest): string {
  const label = WORK_REQUEST_DESCRIPTORS[request.kind].label;
  // Optional chaining, not a null check: rows read through older projections
  // may lack the params field entirely, and a label must never throw.
  const topic = request.params?.topic;
  if (typeof topic === "string") return `${label} — ${topic}`;
  // schedule_mutation carries no topic — its whole content is the owner's
  // instruction, so that is the thing worth showing beside the label.
  const instruction = request.params?.instruction;
  return typeof instruction === "string" ? `${label} — ${instruction}` : label;
}

/**
 * What the operator is told about one request, without ever implying it ran.
 *
 * The waiting copy names the real mechanism — the platform pulls on its next
 * cycle — because an operator who believes this is instant will read silence
 * as failure.
 */
export function describeWorkRequest(request: WorkRequest): string {
  const label = workRequestDisplayLabel(request);

  if (request.outcome === "completed") {
    return `${label} — done.${request.outcomeDetail ? ` ${request.outcomeDetail}` : ""}`;
  }
  if (request.outcome === "refused") {
    return `${label} — not run. ${
      request.outcomeDetail ?? "The platform declined the request."
    }`;
  }
  if (request.outcome === "failed") {
    return `${label} — failed. ${
      request.outcomeDetail ?? "The run did not complete."
    }`;
  }
  return `${label} — queued. It runs the next time the Agent Platform is run.`;
}
