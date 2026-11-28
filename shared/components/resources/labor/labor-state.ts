import type { BillableMode, BurdenMode, WorkspaceInput, FlatRateTask } from "@/shared/lib/resources/labor-workspace";

/**
 * The Labor Cost Workspace's editable state: every number kept as the text
 * the visitor typed, plus the presets, the share-link codec and the parser
 * that turns the text into the math module's input.
 */

export type TechRow = { id: string; name: string; wage: string; paidHours: string };
export type TaskRow = { id: string; task: string; bookHours: string; partCost: string; markupPct: string };

export const NUMERIC_KEYS = [
  "burdenPct",
  "sutaPct",
  "sutaBase",
  "wcPct",
  "health",
  "ptoDays",
  "vehicle",
  "drive",
  "shop",
  "training",
  "callbacks",
  "otherHours",
  "efficiencyPct",
  "rent",
  "office",
  "insurance",
  "software",
  "marketing",
  "vehicles",
  "otherOverhead",
  "marginPct",
  "customRate",
  "afterHoursMult",
  "diagnosticFee",
  "currentRate",
] as const;

export type NumericKey = (typeof NUMERIC_KEYS)[number];

export type LaborState = Record<NumericKey, string> & {
  techs: TechRow[];
  burdenMode: BurdenMode;
  billableMode: BillableMode;
  rateSource: "recommended" | "custom";
  creditDiagnostic: boolean;
  tasks: TaskRow[];
};

const SAMPLE_TASKS: TaskRow[] = [
  { id: "k1", task: "Replace run capacitor", bookHours: "0.75", partCost: "18", markupPct: "100" },
  { id: "k2", task: "Replace contactor", bookHours: "0.5", partCost: "22", markupPct: "100" },
  { id: "k3", task: "Clean condenser coil", bookHours: "1", partCost: "12", markupPct: "100" },
];

/**
 * The worked example on this page: $30 wage, 25% burden, 40 paid and 30
 * billable hours, $6,000 a month of overhead, 20% margin. The advanced burden
 * values are the IRS and KFF figures where a source exists, and labelled
 * samples where it does not (SUTA, workers' comp, PTO, vehicle).
 */
export const WORKED_EXAMPLE: LaborState = {
  techs: [{ id: "t1", name: "Technician 1", wage: "30", paidHours: "40" }],
  burdenMode: "simple",
  burdenPct: "25",
  sutaPct: "2.7",
  sutaBase: "7000",
  wcPct: "4",
  health: "7885",
  ptoDays: "16",
  vehicle: "1200",
  billableMode: "hours",
  drive: "5",
  shop: "2",
  training: "1",
  callbacks: "1",
  otherHours: "1",
  efficiencyPct: "75",
  rent: "1500",
  office: "2000",
  insurance: "600",
  software: "300",
  marketing: "800",
  vehicles: "500",
  otherOverhead: "300",
  marginPct: "20",
  rateSource: "recommended",
  customRate: "",
  afterHoursMult: "1.5",
  diagnosticFee: "0",
  // Optional: what the shop charges per hour today. Blank in every preset, so a result never claims a gap the owner did not ask about.
  currentRate: "",
  creditDiagnostic: true,
  tasks: SAMPLE_TASKS,
};

/** A made-up three-technician shop, to show the crew view. Sample values only. */
export const SAMPLE_CREW: LaborState = {
  ...WORKED_EXAMPLE,
  techs: [
    { id: "t1", name: "Lead technician", wage: "38", paidHours: "40" },
    { id: "t2", name: "Service technician", wage: "30", paidHours: "40" },
    { id: "t3", name: "Apprentice", wage: "21", paidHours: "40" },
  ],
  burdenMode: "advanced",
  rent: "3200",
  office: "6500",
  insurance: "1400",
  software: "600",
  marketing: "2500",
  vehicles: "800",
  otherOverhead: "1000",
  marginPct: "20",
};

/** Every field empty: the starting point for an owner's own numbers. */
export const BLANK: LaborState = {
  ...WORKED_EXAMPLE,
  techs: [{ id: "t1", name: "", wage: "", paidHours: "40" }],
  burdenPct: "",
  drive: "",
  shop: "",
  training: "",
  callbacks: "",
  otherHours: "",
  rent: "",
  office: "",
  insurance: "",
  software: "",
  marketing: "",
  vehicles: "",
  otherOverhead: "",
  marginPct: "",
  tasks: [{ id: "k1", task: "", bookHours: "", partCost: "", markupPct: "100" }],
};

export function num(raw: string): number {
  const value = Number.parseFloat(raw.replace(/[$,%\s]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

export function toWorkspaceInput(state: LaborState, marginOverride?: number): WorkspaceInput {
  return {
    techs: state.techs.map((tech) => ({
      id: tech.id,
      name: tech.name,
      wage: num(tech.wage),
      paidHours: num(tech.paidHours),
    })),
    burdenMode: state.burdenMode,
    burdenRate: num(state.burdenPct) / 100,
    advanced: {
      sutaRate: num(state.sutaPct) / 100,
      sutaWageBase: num(state.sutaBase),
      workersCompRate: num(state.wcPct) / 100,
      healthPerYear: num(state.health),
      ptoDays: num(state.ptoDays),
      vehiclePerMonth: num(state.vehicle),
    },
    billableMode: state.billableMode,
    unbillable: {
      drive: num(state.drive),
      shop: num(state.shop),
      training: num(state.training),
      callbacks: num(state.callbacks),
      other: num(state.otherHours),
    },
    efficiency: num(state.efficiencyPct) / 100,
    overhead: {
      rent: num(state.rent),
      office: num(state.office),
      insurance: num(state.insurance),
      software: num(state.software),
      marketing: num(state.marketing),
      vehicles: num(state.vehicles),
      other: num(state.otherOverhead),
    },
    margin: marginOverride ?? num(state.marginPct) / 100,
  };
}

export function toFlatRateTask(row: TaskRow): FlatRateTask {
  return {
    id: row.id,
    task: row.task,
    bookHours: num(row.bookHours),
    partCost: num(row.partCost),
    markup: num(row.markupPct) / 100,
  };
}

/* ---------------- share link + saved copy ---------------- */

const NUMBER_TEXT = /^-?\d{0,9}(\.\d{0,4})?$/;

function cleanNumber(value: unknown, fallback: string): string {
  return typeof value === "string" && NUMBER_TEXT.test(value) ? value : fallback;
}
function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, "").slice(0, max) : "";
}

/**
 * Rebuilds a state from untrusted JSON (a shared link or this browser's saved
 * copy): only known keys, only number-looking numbers, short plain names.
 * Anything else falls back to the worked example.
 */
export function sanitizeState(raw: unknown): LaborState | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const out: LaborState = { ...WORKED_EXAMPLE };
  for (const key of NUMERIC_KEYS) out[key] = cleanNumber(source[key], WORKED_EXAMPLE[key]);
  out.burdenMode = source.burdenMode === "advanced" ? "advanced" : "simple";
  out.billableMode = source.billableMode === "efficiency" ? "efficiency" : "hours";
  out.rateSource = source.rateSource === "custom" ? "custom" : "recommended";
  out.creditDiagnostic = source.creditDiagnostic !== false;

  if (Array.isArray(source.techs)) {
    out.techs = source.techs.slice(0, 25).map((row, index) => {
      const r = (row ?? {}) as Record<string, unknown>;
      return {
        id: `t${index + 1}`,
        name: cleanText(r.name, 40),
        wage: cleanNumber(r.wage, ""),
        paidHours: cleanNumber(r.paidHours, ""),
      };
    });
  }
  if (Array.isArray(source.tasks)) {
    out.tasks = source.tasks.slice(0, 30).map((row, index) => {
      const r = (row ?? {}) as Record<string, unknown>;
      return {
        id: `k${index + 1}`,
        task: cleanText(r.task, 60),
        bookHours: cleanNumber(r.bookHours, ""),
        partCost: cleanNumber(r.partCost, ""),
        markupPct: cleanNumber(r.markupPct, ""),
      };
    });
  }
  return out;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): string | null {
  try {
    const padded = text.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded + "===".slice((padded.length + 3) % 4));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Ids are positional, so they are not stored. */
function compact(state: LaborState) {
  return {
    ...state,
    techs: state.techs.map(({ name, wage, paidHours }) => ({ name, wage, paidHours })),
    tasks: state.tasks.map(({ task, bookHours, partCost, markupPct }) => ({ task, bookHours, partCost, markupPct })),
  };
}

export function encodeState(state: LaborState): string {
  return toBase64Url(JSON.stringify(compact(state)));
}

export function decodeState(param: string): LaborState | null {
  if (param.length > 8000) return null;
  const json = fromBase64Url(param);
  if (!json) return null;
  try {
    return sanitizeState(JSON.parse(json));
  } catch {
    return null;
  }
}

export function storableState(state: LaborState) {
  return compact(state);
}

export const STORAGE_KEY = "altair-tool:labor-cost-workspace:v1";
export const SHARE_PARAM = "w";
