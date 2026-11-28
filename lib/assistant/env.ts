import "server-only";

import { isAiDraftingConfigured } from "@/lib/ai/env";

const ASSISTANT_ENABLED_ENV = "AI_ASSISTANT_ENABLED";

/**
 * The assistant's master switch. Off unless set, and it cannot be on while
 * the AI features as a whole are off or unconfigured: `AI_FEATURES_ENABLED`
 * stays the one switch that turns every model call off at once.
 */
export function isAssistantEnabled(): boolean {
  const raw = process.env[ASSISTANT_ENABLED_ENV]?.trim().toLowerCase();
  return (raw === "true" || raw === "1") && isAiDraftingConfigured();
}
