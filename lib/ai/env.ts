import "server-only";

const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";
const AI_MODEL_ENV = "AI_MODEL";
const AI_FEATURES_ENABLED_ENV = "AI_FEATURES_ENABLED";

/** Default model when AI_MODEL is unset. Server-side only. */
export const DEFAULT_AI_MODEL = "gpt-4o-mini";

export type AiConfig = {
  enabled: boolean;
  model: string;
  /** Present only when configured; never expose to the browser. */
  apiKey: string | null;
  hasApiKey: boolean;
};

export function isAiFeaturesEnabled(): boolean {
  const raw = process.env[AI_FEATURES_ENABLED_ENV]?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

/** True when AI drafting can run (feature flag on and API key present). */
export function isAiDraftingConfigured(): boolean {
  if (!isAiFeaturesEnabled()) {
    return false;
  }

  return Boolean(process.env[OPENAI_API_KEY_ENV]?.trim());
}

export function getAiConfig(): AiConfig {
  const apiKey = process.env[OPENAI_API_KEY_ENV]?.trim() || null;
  const model = process.env[AI_MODEL_ENV]?.trim() || DEFAULT_AI_MODEL;

  return {
    enabled: isAiFeaturesEnabled(),
    model,
    apiKey,
    hasApiKey: Boolean(apiKey),
  };
}

/** Returns env var names missing when AI is enabled but cannot run. */
export function getMissingAiEnvVarsWhenEnabled(): string[] {
  if (!isAiFeaturesEnabled()) {
    return [];
  }

  const missing: string[] = [];

  if (!process.env[OPENAI_API_KEY_ENV]?.trim()) {
    missing.push(OPENAI_API_KEY_ENV);
  }

  return missing;
}
