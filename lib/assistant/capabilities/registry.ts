import { helpReadCapability, helpSearchCapability } from "@/lib/assistant/capabilities/help";
import type { AssistantCapability } from "@/lib/assistant/types";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";

/**
 * The one list. Everything the assistant can look up or do is an entry here,
 * and nothing else is. Adding an ability is adding an entry (with its tests
 * in scripts/verify-assistant.mjs), never a special case in the engine.
 *
 * `npm run verify:assistant` checks every entry: a unique, well-shaped id, a
 * closed input schema, no service-role client anywhere under lib/assistant,
 * and no write capability until the confirm card exists.
 */
export const ASSISTANT_CAPABILITIES: readonly AssistantCapability[] = [
  helpSearchCapability,
  helpReadCapability,
];

/** What this person's assistant can do. Built per person, per request. */
export function listAssistantCapabilitiesFor(
  context: ActiveCompanyContext,
): AssistantCapability[] {
  return ASSISTANT_CAPABILITIES.filter(
    (capability) => capability.kind === "read" && capability.allowed(context),
  );
}
