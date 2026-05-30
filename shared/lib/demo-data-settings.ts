import type { Json } from "@/lib/database/types/enums";
import type { CompanyDemoDataSettings } from "@/shared/types/demo-data";

export const DEMO_DATA_NAME_PREFIX = "[Demo] ";

function isRecord(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCompanyDemoDataSettings(
  settings: Json | null | undefined,
): CompanyDemoDataSettings | null {
  if (!isRecord(settings)) {
    return null;
  }

  const raw = settings.demoData;
  if (!isRecord(raw)) {
    return null;
  }

  const version = raw.version;
  const seededAt = raw.seededAt;
  const seededBy = raw.seededBy;

  if (
    typeof version !== "number" ||
    typeof seededAt !== "string" ||
    typeof seededBy !== "string"
  ) {
    return null;
  }

  return { version, seededAt, seededBy };
}

export function serializeCompanyDemoDataSettings(
  currentSettings: Json,
  demoData: CompanyDemoDataSettings,
): Json {
  const existing = isRecord(currentSettings) ? currentSettings : {};

  return {
    ...existing,
    demoData: {
      version: demoData.version,
      seededAt: demoData.seededAt,
      seededBy: demoData.seededBy,
    },
  };
}

export function removeCompanyDemoDataSettings(currentSettings: Json): Json {
  if (!isRecord(currentSettings)) {
    return {};
  }

  const next = { ...currentSettings };
  delete next.demoData;
  return next;
}

export function withDemoName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.startsWith(DEMO_DATA_NAME_PREFIX)) {
    return trimmed;
  }

  return `${DEMO_DATA_NAME_PREFIX}${trimmed}`;
}
