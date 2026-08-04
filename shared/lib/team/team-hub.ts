/**
 * Team hub tabs — Technicians + Time Clock.
 * Legacy `/technicians` and `/time-clock` redirect here.
 */

export const TEAM_HUB_TAB_IDS = ["technicians", "time-clock"] as const;

export type TeamHubTabId = (typeof TEAM_HUB_TAB_IDS)[number];

export const TEAM_HUB_TAB_LABELS: Record<TeamHubTabId, string> = {
  technicians: "Technicians",
  "time-clock": "Time Clock",
};

export const TEAM_HUB_DEFAULT_TAB: TeamHubTabId = "technicians";

export function isTeamHubTabId(value: string): value is TeamHubTabId {
  return (TEAM_HUB_TAB_IDS as readonly string[]).includes(value);
}

export function resolveTeamHubTab(
  value: string | undefined | null,
  access?: { canTechnicians?: boolean; canTimeClock?: boolean },
): TeamHubTabId {
  const canTechnicians = access?.canTechnicians ?? true;
  const canTimeClock = access?.canTimeClock ?? true;
  const requested =
    value && isTeamHubTabId(value) ? (value as TeamHubTabId) : null;

  if (requested === "technicians" && canTechnicians) {
    return "technicians";
  }

  if (requested === "time-clock" && canTimeClock) {
    return "time-clock";
  }

  if (canTechnicians) {
    return "technicians";
  }

  if (canTimeClock) {
    return "time-clock";
  }

  return TEAM_HUB_DEFAULT_TAB;
}

/**
 * In-app Team hub href. Default tab (Technicians) omits `tab`, matching
 * Customers hub. Pass `forceTab` for explicit legacy redirects.
 */
export function buildTeamHubHref(
  tab: TeamHubTabId = TEAM_HUB_DEFAULT_TAB,
  params?: Record<string, string | undefined | null>,
  options?: { forceTab?: boolean },
): string {
  const search = new URLSearchParams();

  if (tab !== TEAM_HUB_DEFAULT_TAB || options?.forceTab) {
    search.set("tab", tab);
  }

  if (params) {
    for (const [key, raw] of Object.entries(params)) {
      if (key === "tab" || raw == null || raw === "") {
        continue;
      }

      search.set(key, raw);
    }
  }

  const query = search.toString();
  return query ? `/team?${query}` : "/team";
}

/** Legacy `/technicians` → Team hub Technicians tab (preserves query params). */
export function buildTeamHubHrefFromTechniciansParams(params: {
  [key: string]: string | undefined;
}): string {
  const rest = { ...params };
  delete rest.tab;
  return buildTeamHubHref("technicians", rest, { forceTab: true });
}

/** Legacy `/time-clock` → Team hub Time Clock tab (preserves query params). */
export function buildTeamHubHrefFromTimeClockParams(params: {
  [key: string]: string | undefined;
}): string {
  const rest = { ...params };
  delete rest.tab;
  return buildTeamHubHref("time-clock", rest);
}

export function flattenSearchParamRecord(
  params: Record<string, string | string[] | undefined>,
): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};

  for (const [key, value] of Object.entries(params)) {
    out[key] = Array.isArray(value) ? value[0] : value;
  }

  return out;
}
