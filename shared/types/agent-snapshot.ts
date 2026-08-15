/**
 * The Altair OS mirror of the Agent Platform's marketing snapshot contract.
 *
 * WHAT THIS IS. A hand-written mirror of
 * `Altair-agent-platform/src/integration/altair-os-contract.ts` (v1). The two
 * repositories share a CONTRACT, never code — the same deliberate duplication
 * the platform already uses against AltairDemoTool's job spec. Drift fails
 * loudly at `contractVersion`, not silently at a field.
 *
 * WHY NO SCHEMA LIBRARY. Altair OS has no validation dependency and this
 * change does not add one. The envelope and every section wrapper are checked
 * strictly here; item rows are parsed field-by-field by small readers that
 * return null on a shape they cannot read. A malformed ITEM is dropped and
 * COUNTED (`droppedItems`) rather than silently kept or silently discarded —
 * a dashboard that quietly shows nine of ten rows is worse than one that says
 * it dropped one.
 *
 * WHAT IT REFUSES. A wrong `contractVersion`, a missing or non-object
 * envelope, an unknown support level, a `NOT_SUPPORTED` section with no
 * reason (or a reason on a supported one), a non-array `items`, or a
 * `companyId` that is not a non-empty string. Refusal is total: the whole
 * payload is rejected rather than partially stored.
 *
 * THE SNAPSHOT IS A READ MODEL. Nothing in it grants anything. It carries no
 * provider token, no signed URL, no local filesystem path — the producer's
 * own tests enforce that — and this side treats every string as untrusted
 * display text regardless.
 */

export const AGENT_SNAPSHOT_CONTRACT_VERSION = 1;

export type AgentSectionSupport =
  | "SUPPORTED_WITH_DATA"
  | "SUPPORTED_EMPTY"
  | "NOT_SUPPORTED";

export type AgentSnapshotProvenance =
  | "LIVE"
  | "MOCK"
  | "FAKE"
  | "NONE"
  | "MIXED"
  | "UNKNOWN";

export type AgentListSection<T> = {
  support: AgentSectionSupport;
  unsupportedReason: string | null;
  items: T[];
};

export type AgentSingleSection<T> = {
  support: AgentSectionSupport;
  unsupportedReason: string | null;
  data: T | null;
};

export type AgentAutomationStatus = {
  companyId: string;
  observedAt: string;
  schedulesActive: number;
  schedulesPaused: number;
  schedulesFailed: number;
  nextScheduledRunAt: string | null;
  lastScheduleRunAt: string | null;
  lastCompletedRunAt: string | null;
  lastFailedRunAt: string | null;
  hoursSinceLastCompletedRun: number | null;
  tasksPending: number;
  tasksRunning: number;
  tasksAwaitingApproval: number;
  tasksFailed: number;
  approvalsPending: number;
  dataProvenance: AgentSnapshotProvenance;
  modelProvenance: AgentSnapshotProvenance;
};

export type AgentActivityEntry = {
  companyId: string;
  runId: string;
  taskId: string;
  agentId: string;
  taskType: string;
  taskDescription: string;
  runState: string;
  taskState: string;
  attempt: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  estimatedCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  errorSummary: string | null;
};

export type AgentStatusEntry = {
  companyId: string;
  agentId: string;
  name: string;
  enabled: boolean;
  grantedToolCount: number;
  allowedRiskClasses: string[];
  canActExternally: boolean;
  lastRunAt: string | null;
  lastRunState: string | null;
  runsCompleted: number;
  runsFailed: number;
  openTaskCount: number;
};

export type AgentUpcomingWorkEntry = {
  companyId: string;
  scheduleId: string;
  name: string;
  agentId: string;
  jobName: string;
  scheduleState: string;
  intervalMs: number | null;
  nextRunAt: string;
  lastRunAt: string | null;
  missedRunPolicy: string;
  isDue: boolean;
};

export type AgentCampaignMetric = {
  metric: string;
  unit: string;
  pointsExamined: number;
  latest: number | null;
  baselineMean: number | null;
  percentChange: number | null;
  direction: string | null;
};

export type AgentCampaignEntry = {
  companyId: string;
  channel: string;
  provenance: AgentSnapshotProvenance;
  observedAt: string;
  sourceArtifactId: string;
  metrics: AgentCampaignMetric[];
  signalCount: number;
};

export type AgentRecommendationAction = {
  kind: string;
  channel: string | null;
  action: string;
  rationale: string;
  expectedImpact: string;
};

export type AgentRecommendationEntry = {
  companyId: string;
  artifactId: string;
  artifactLifecycle: string;
  title: string;
  createdAt: string;
  dataProvenance: AgentSnapshotProvenance;
  modelProvenance: AgentSnapshotProvenance;
  resolvedWithoutModel: boolean;
  headline: string | null;
  diagnosis: string | null;
  actions: AgentRecommendationAction[];
  experimentCount: number;
  hypothesisCount: number;
  isAdviceOnly: true;
};

export type AgentApprovalItem = {
  companyId: string;
  approvalId: string;
  effectToken: string;
  toolId: string;
  requestedByAgentId: string;
  approverId: string | null;
  approvalDecision: string;
  humanSummary: string;
  requestedAt: string;
  expiresAt: string;
  decidedAt: string | null;
  isExpired: boolean;
  deliveryState: string | null;
};

/**
 * Whether a finished render can actually be watched from this deployment.
 *
 * NONE            no master exists.
 * NOT_TRANSPORTED a master exists, but only on the machine that rendered it —
 *                 either that deployment has no media transport configured,
 *                 or the upload has not succeeded yet.
 * AVAILABLE       the platform uploaded the bytes and this deployment
 *                 confirmed storing them.
 *
 * Kept as data rather than inferred from `hasRenderedMaster`, because
 * "rendered" and "watchable" are different facts and a UI that conflates them
 * promises a preview it cannot serve.
 *
 * AVAILABLE IS NOT PERMISSION, and this page does not use it as such. Whether
 * a video can be played here is decided against `marketing_media_assets` and
 * a freshly minted signed URL, not against a flag in a snapshot that was
 * pushed some minutes ago and describes what another system believes.
 */
export type AgentPreviewAvailability = "NONE" | "NOT_TRANSPORTED" | "AVAILABLE";

export type AgentVideoRenderEntry = {
  companyId: string;
  jobId: string;
  contentArtifactId: string | null;
  attempt: number;
  renderState: string;
  stage: string | null;
  editorVersion: string | null;
  hasRenderedMaster: boolean;
  failureName: string | null;
  failureMessage: string | null;
  /** Facts about the master. Null means "not reported", never zero. */
  durationMs: number | null;
  widthPx: number | null;
  heightPx: number | null;
  outputBytes: number | null;
  videoCodec: string | null;
  hasAudio: boolean | null;
  previewAvailability: AgentPreviewAvailability;
  submittedAt: string | null;
  recordedAt: string | null;
  renderJobArtifactId: string | null;
  renderResultArtifactId: string | null;
};

export type AgentKnownGap = {
  capability: string;
  reason: string;
};

export type AgentMarketingSnapshot = {
  contractVersion: number;
  companyId: string;
  producedAt: string;
  sections: {
    automationStatus: AgentSingleSection<AgentAutomationStatus>;
    recentActivity: AgentListSection<AgentActivityEntry>;
    agentStatus: AgentListSection<AgentStatusEntry>;
    upcomingWork: AgentListSection<AgentUpcomingWorkEntry>;
    campaign: AgentListSection<AgentCampaignEntry>;
    recommendations: AgentListSection<AgentRecommendationEntry>;
    approvals: AgentListSection<AgentApprovalItem>;
    videoRenders: AgentListSection<AgentVideoRenderEntry>;
  };
  knownGaps: AgentKnownGap[];
};

export const AGENT_SNAPSHOT_SECTION_KEYS = [
  "automationStatus",
  "recentActivity",
  "agentStatus",
  "upcomingWork",
  "campaign",
  "recommendations",
  "approvals",
  "videoRenders",
] as const;

export type AgentSnapshotSectionKey =
  (typeof AGENT_SNAPSHOT_SECTION_KEYS)[number];

// ---------------------------------------------------------------------------
// Readers — total, never throwing, returning null on a shape they cannot read
// ---------------------------------------------------------------------------

const SUPPORT_LEVELS: AgentSectionSupport[] = [
  "SUPPORTED_WITH_DATA",
  "SUPPORTED_EMPTY",
  "NOT_SUPPORTED",
];

const PROVENANCE_VALUES: AgentSnapshotProvenance[] = [
  "LIVE",
  "MOCK",
  "FAKE",
  "NONE",
  "MIXED",
  "UNKNOWN",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function bool(value: unknown): boolean {
  return value === true;
}

function provenance(value: unknown): AgentSnapshotProvenance {
  return typeof value === "string" &&
    (PROVENANCE_VALUES as string[]).includes(value)
    ? (value as AgentSnapshotProvenance)
    : "UNKNOWN";
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function readAutomationStatus(raw: unknown): AgentAutomationStatus | null {
  if (!isRecord(raw)) return null;
  const companyId = str(raw.companyId);
  const observedAt = str(raw.observedAt);
  if (!companyId || !observedAt) return null;
  return {
    companyId,
    observedAt,
    schedulesActive: num(raw.schedulesActive) ?? 0,
    schedulesPaused: num(raw.schedulesPaused) ?? 0,
    schedulesFailed: num(raw.schedulesFailed) ?? 0,
    nextScheduledRunAt: strOrNull(raw.nextScheduledRunAt),
    lastScheduleRunAt: strOrNull(raw.lastScheduleRunAt),
    lastCompletedRunAt: strOrNull(raw.lastCompletedRunAt),
    lastFailedRunAt: strOrNull(raw.lastFailedRunAt),
    hoursSinceLastCompletedRun: numOrNull(raw.hoursSinceLastCompletedRun),
    tasksPending: num(raw.tasksPending) ?? 0,
    tasksRunning: num(raw.tasksRunning) ?? 0,
    tasksAwaitingApproval: num(raw.tasksAwaitingApproval) ?? 0,
    tasksFailed: num(raw.tasksFailed) ?? 0,
    approvalsPending: num(raw.approvalsPending) ?? 0,
    dataProvenance: provenance(raw.dataProvenance),
    modelProvenance: provenance(raw.modelProvenance),
  };
}

function readActivity(raw: unknown): AgentActivityEntry | null {
  if (!isRecord(raw)) return null;
  const runId = str(raw.runId);
  const companyId = str(raw.companyId);
  const startedAt = str(raw.startedAt);
  if (!runId || !companyId || !startedAt) return null;
  return {
    companyId,
    runId,
    taskId: str(raw.taskId) ?? "",
    agentId: str(raw.agentId) ?? "",
    taskType: str(raw.taskType) ?? "",
    taskDescription: strOrNull(raw.taskDescription) ?? "",
    runState: str(raw.runState) ?? "UNKNOWN",
    taskState: str(raw.taskState) ?? "UNKNOWN",
    attempt: num(raw.attempt) ?? 1,
    startedAt,
    completedAt: strOrNull(raw.completedAt),
    durationMs: numOrNull(raw.durationMs),
    estimatedCostUsd: num(raw.estimatedCostUsd) ?? 0,
    totalInputTokens: num(raw.totalInputTokens) ?? 0,
    totalOutputTokens: num(raw.totalOutputTokens) ?? 0,
    errorSummary: strOrNull(raw.errorSummary),
  };
}

function readAgentStatus(raw: unknown): AgentStatusEntry | null {
  if (!isRecord(raw)) return null;
  const agentId = str(raw.agentId);
  const companyId = str(raw.companyId);
  if (!agentId || !companyId) return null;
  return {
    companyId,
    agentId,
    name: strOrNull(raw.name) ?? agentId,
    enabled: bool(raw.enabled),
    grantedToolCount: num(raw.grantedToolCount) ?? 0,
    allowedRiskClasses: strArray(raw.allowedRiskClasses),
    canActExternally: bool(raw.canActExternally),
    lastRunAt: strOrNull(raw.lastRunAt),
    lastRunState: strOrNull(raw.lastRunState),
    runsCompleted: num(raw.runsCompleted) ?? 0,
    runsFailed: num(raw.runsFailed) ?? 0,
    openTaskCount: num(raw.openTaskCount) ?? 0,
  };
}

function readUpcomingWork(raw: unknown): AgentUpcomingWorkEntry | null {
  if (!isRecord(raw)) return null;
  const scheduleId = str(raw.scheduleId);
  const companyId = str(raw.companyId);
  const nextRunAt = str(raw.nextRunAt);
  if (!scheduleId || !companyId || !nextRunAt) return null;
  return {
    companyId,
    scheduleId,
    name: strOrNull(raw.name) ?? scheduleId,
    agentId: str(raw.agentId) ?? "",
    jobName: str(raw.jobName) ?? "",
    scheduleState: str(raw.scheduleState) ?? "UNKNOWN",
    intervalMs: numOrNull(raw.intervalMs),
    nextRunAt,
    lastRunAt: strOrNull(raw.lastRunAt),
    missedRunPolicy: str(raw.missedRunPolicy) ?? "RUN_ONCE",
    isDue: bool(raw.isDue),
  };
}

function readCampaign(raw: unknown): AgentCampaignEntry | null {
  if (!isRecord(raw)) return null;
  const channel = str(raw.channel);
  const companyId = str(raw.companyId);
  const observedAt = str(raw.observedAt);
  if (!channel || !companyId || !observedAt) return null;
  const metrics = Array.isArray(raw.metrics)
    ? raw.metrics
        .map((entry): AgentCampaignMetric | null => {
          if (!isRecord(entry)) return null;
          const metric = str(entry.metric);
          if (!metric) return null;
          return {
            metric,
            unit: str(entry.unit) ?? "",
            pointsExamined: num(entry.pointsExamined) ?? 0,
            latest: numOrNull(entry.latest),
            baselineMean: numOrNull(entry.baselineMean),
            percentChange: numOrNull(entry.percentChange),
            direction: strOrNull(entry.direction),
          };
        })
        .filter((entry): entry is AgentCampaignMetric => entry !== null)
    : [];
  return {
    companyId,
    channel,
    provenance: provenance(raw.provenance),
    observedAt,
    sourceArtifactId: str(raw.sourceArtifactId) ?? "",
    metrics,
    signalCount: num(raw.signalCount) ?? 0,
  };
}

function readRecommendation(raw: unknown): AgentRecommendationEntry | null {
  if (!isRecord(raw)) return null;
  const artifactId = str(raw.artifactId);
  const companyId = str(raw.companyId);
  const createdAt = str(raw.createdAt);
  if (!artifactId || !companyId || !createdAt) return null;
  const actions = Array.isArray(raw.actions)
    ? raw.actions
        .map((entry): AgentRecommendationAction | null => {
          if (!isRecord(entry)) return null;
          const action = str(entry.action);
          if (!action) return null;
          return {
            kind: str(entry.kind) ?? "other",
            channel: strOrNull(entry.channel),
            action,
            rationale: strOrNull(entry.rationale) ?? "",
            expectedImpact: strOrNull(entry.expectedImpact) ?? "",
          };
        })
        .filter((entry): entry is AgentRecommendationAction => entry !== null)
    : [];
  return {
    companyId,
    artifactId,
    artifactLifecycle: str(raw.artifactLifecycle) ?? "DRAFT",
    title: strOrNull(raw.title) ?? "",
    createdAt,
    dataProvenance: provenance(raw.dataProvenance),
    modelProvenance: provenance(raw.modelProvenance),
    resolvedWithoutModel: bool(raw.resolvedWithoutModel),
    headline: strOrNull(raw.headline),
    diagnosis: strOrNull(raw.diagnosis),
    actions,
    experimentCount: num(raw.experimentCount) ?? 0,
    hypothesisCount: num(raw.hypothesisCount) ?? 0,
    isAdviceOnly: true,
  };
}

function readApproval(raw: unknown): AgentApprovalItem | null {
  if (!isRecord(raw)) return null;
  const approvalId = str(raw.approvalId);
  const companyId = str(raw.companyId);
  const effectToken = str(raw.effectToken);
  const expiresAt = str(raw.expiresAt);
  if (!approvalId || !companyId || !effectToken || !expiresAt) return null;
  return {
    companyId,
    approvalId,
    effectToken,
    toolId: str(raw.toolId) ?? "",
    requestedByAgentId: str(raw.requestedByAgentId) ?? "",
    approverId: strOrNull(raw.approverId),
    approvalDecision: str(raw.approvalDecision) ?? "PENDING",
    humanSummary: strOrNull(raw.humanSummary) ?? "",
    requestedAt: str(raw.requestedAt) ?? expiresAt,
    expiresAt,
    decidedAt: strOrNull(raw.decidedAt),
    isExpired: bool(raw.isExpired),
    deliveryState: strOrNull(raw.deliveryState),
  };
}

function previewAvailability(value: unknown): AgentPreviewAvailability {
  return value === "NOT_TRANSPORTED" || value === "AVAILABLE" ? value : "NONE";
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readVideoRender(raw: unknown): AgentVideoRenderEntry | null {
  if (!isRecord(raw)) return null;
  const jobId = str(raw.jobId);
  const companyId = str(raw.companyId);
  if (!jobId || !companyId) return null;
  return {
    companyId,
    jobId,
    contentArtifactId: strOrNull(raw.contentArtifactId),
    attempt: num(raw.attempt) ?? 1,
    renderState: str(raw.renderState) ?? "UNKNOWN",
    stage: strOrNull(raw.stage),
    editorVersion: strOrNull(raw.editorVersion),
    hasRenderedMaster: bool(raw.hasRenderedMaster),
    failureName: strOrNull(raw.failureName),
    failureMessage: strOrNull(raw.failureMessage),
    durationMs: numOrNull(raw.durationMs),
    widthPx: numOrNull(raw.widthPx),
    heightPx: numOrNull(raw.heightPx),
    outputBytes: numOrNull(raw.outputBytes),
    videoCodec: strOrNull(raw.videoCodec),
    hasAudio: boolOrNull(raw.hasAudio),
    previewAvailability: previewAvailability(raw.previewAvailability),
    submittedAt: strOrNull(raw.submittedAt),
    recordedAt: strOrNull(raw.recordedAt),
    renderJobArtifactId: strOrNull(raw.renderJobArtifactId),
    renderResultArtifactId: strOrNull(raw.renderResultArtifactId),
  };
}

// ---------------------------------------------------------------------------
// Envelope parsing — strict, total, and explicit about what it dropped
// ---------------------------------------------------------------------------

export type AgentSnapshotParseResult =
  | { ok: true; snapshot: AgentMarketingSnapshot; droppedItems: number }
  | { ok: false; error: string };

type SectionWrapper = {
  support: AgentSectionSupport;
  unsupportedReason: string | null;
  rawItems: unknown[];
  rawData: unknown;
};

function readSectionWrapper(
  raw: unknown,
  key: string,
  expectSingle: boolean,
): { ok: true; wrapper: SectionWrapper } | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: `sections.${key} is not an object` };
  }
  const support = raw.support;
  if (
    typeof support !== "string" ||
    !(SUPPORT_LEVELS as string[]).includes(support)
  ) {
    return { ok: false, error: `sections.${key}.support is not a known level` };
  }
  const reason = raw.unsupportedReason;
  if (reason !== null && typeof reason !== "string") {
    return {
      ok: false,
      error: `sections.${key}.unsupportedReason must be a string or null`,
    };
  }
  // The producer's own invariant, re-checked here rather than trusted: an
  // unexplained NOT_SUPPORTED reads to a user as "nothing there".
  const isUnsupported = support === "NOT_SUPPORTED";
  const hasReason = typeof reason === "string" && reason.length > 0;
  if (isUnsupported !== hasReason) {
    return {
      ok: false,
      error: `sections.${key} must carry unsupportedReason exactly when NOT_SUPPORTED`,
    };
  }
  if (expectSingle) {
    if (!("data" in raw)) {
      return { ok: false, error: `sections.${key}.data is missing` };
    }
    return {
      ok: true,
      wrapper: {
        support: support as AgentSectionSupport,
        unsupportedReason: hasReason ? (reason as string) : null,
        rawItems: [],
        rawData: raw.data,
      },
    };
  }
  if (!Array.isArray(raw.items)) {
    return { ok: false, error: `sections.${key}.items is not an array` };
  }
  return {
    ok: true,
    wrapper: {
      support: support as AgentSectionSupport,
      unsupportedReason: hasReason ? (reason as string) : null,
      rawItems: raw.items,
      rawData: null,
    },
  };
}

/**
 * Parses an untrusted payload into the mirrored contract.
 *
 * Total: it never throws. Either the whole payload is accepted, or it is
 * rejected with a reason naming the first thing that was wrong. Individual
 * malformed ITEMS inside an otherwise valid section are dropped and counted.
 */
export function parseAgentMarketingSnapshot(
  input: unknown,
): AgentSnapshotParseResult {
  if (!isRecord(input)) {
    return { ok: false, error: "Payload is not a JSON object" };
  }
  if (input.contractVersion !== AGENT_SNAPSHOT_CONTRACT_VERSION) {
    return {
      ok: false,
      error: `Unsupported contractVersion ${String(input.contractVersion)}; this deployment accepts ${AGENT_SNAPSHOT_CONTRACT_VERSION}`,
    };
  }
  const companyId = str(input.companyId);
  if (!companyId) {
    return { ok: false, error: "companyId is missing or empty" };
  }
  const producedAt = str(input.producedAt);
  if (!producedAt || Number.isNaN(Date.parse(producedAt))) {
    return { ok: false, error: "producedAt is missing or not a timestamp" };
  }
  if (!isRecord(input.sections)) {
    return { ok: false, error: "sections is missing" };
  }
  const sections = input.sections;
  for (const key of AGENT_SNAPSHOT_SECTION_KEYS) {
    if (!(key in sections)) {
      return { ok: false, error: `sections.${key} is missing` };
    }
  }

  let dropped = 0;
  function list<T>(
    key: AgentSnapshotSectionKey,
    read: (raw: unknown) => T | null,
  ): AgentListSection<T> | string {
    const parsed = readSectionWrapper(sections[key], key, false);
    if (!parsed.ok) return parsed.error;
    const items: T[] = [];
    for (const raw of parsed.wrapper.rawItems) {
      const item = read(raw);
      if (item === null) {
        dropped += 1;
        continue;
      }
      items.push(item);
    }
    return {
      support: parsed.wrapper.support,
      unsupportedReason: parsed.wrapper.unsupportedReason,
      items,
    };
  }

  const statusWrapper = readSectionWrapper(
    sections.automationStatus,
    "automationStatus",
    true,
  );
  if (!statusWrapper.ok) return { ok: false, error: statusWrapper.error };
  const statusData =
    statusWrapper.wrapper.rawData === null
      ? null
      : readAutomationStatus(statusWrapper.wrapper.rawData);

  const recentActivity = list("recentActivity", readActivity);
  if (typeof recentActivity === "string")
    return { ok: false, error: recentActivity };
  const agentStatus = list("agentStatus", readAgentStatus);
  if (typeof agentStatus === "string") return { ok: false, error: agentStatus };
  const upcomingWork = list("upcomingWork", readUpcomingWork);
  if (typeof upcomingWork === "string")
    return { ok: false, error: upcomingWork };
  const campaign = list("campaign", readCampaign);
  if (typeof campaign === "string") return { ok: false, error: campaign };
  const recommendations = list("recommendations", readRecommendation);
  if (typeof recommendations === "string")
    return { ok: false, error: recommendations };
  const approvals = list("approvals", readApproval);
  if (typeof approvals === "string") return { ok: false, error: approvals };
  const videoRenders = list("videoRenders", readVideoRender);
  if (typeof videoRenders === "string")
    return { ok: false, error: videoRenders };

  const knownGaps = Array.isArray(input.knownGaps)
    ? input.knownGaps
        .map((entry): AgentKnownGap | null => {
          if (!isRecord(entry)) return null;
          const capability = str(entry.capability);
          if (!capability) return null;
          return { capability, reason: strOrNull(entry.reason) ?? "" };
        })
        .filter((entry): entry is AgentKnownGap => entry !== null)
    : [];

  return {
    ok: true,
    droppedItems: dropped,
    snapshot: {
      contractVersion: AGENT_SNAPSHOT_CONTRACT_VERSION,
      companyId,
      producedAt,
      sections: {
        automationStatus: {
          support: statusWrapper.wrapper.support,
          unsupportedReason: statusWrapper.wrapper.unsupportedReason,
          data: statusData,
        },
        recentActivity,
        agentStatus,
        upcomingWork,
        campaign,
        recommendations,
        approvals,
        videoRenders,
      },
      knownGaps,
    },
  };
}
