import { validateCapabilityInput } from "@/lib/assistant/engine/input";
import { buildAssistantSystemPrompt } from "@/lib/assistant/engine/prompt";
import {
  createDataMarker,
  hasUnsupportedMoney,
  sanitizeModelText,
  wrapCapabilityData,
} from "@/lib/assistant/engine/text";
import type {
  AssistantBlock,
  AssistantCapability,
  AssistantHistoryMessage,
  AssistantModel,
  AssistantModelMessage,
  AssistantModelTool,
  AssistantSource,
  AssistantToolCall,
  AssistantTurnOutcome,
} from "@/lib/assistant/types";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";

/**
 * One turn of the assistant: a question in, an answer and its sources out.
 *
 * The engine is deliberately ignorant. It does not know which provider the
 * model is, whether the question was typed or spoken, or what any capability
 * does. It takes the person's context as an argument and never looks one up,
 * so it cannot answer for anyone but the person it was handed (rule 1), and
 * it can be tested with a scripted model and no database.
 *
 * What it guarantees, whatever the model does:
 *   - only capabilities this person is allowed are offered, and only those
 *     can run (rule 3);
 *   - input is validated before a capability sees it;
 *   - no write capability runs (rule 6 has no confirm card yet);
 *   - capability results reach the model inside an envelope a record cannot
 *     close (rule 5);
 *   - the reply is plain text, and talks about money only by quoting a figure
 *     a capability declared (rules 4 and 5);
 *   - the number of model calls and capability runs is bounded (rule 8);
 *   - it never throws: every failure becomes a plain outcome.
 *
 * The caller's part: `roleLabel` and `today` are written into the model's
 * instructions and must be derived on the server, never taken from the
 * request; `limits` is for tests and server code, never for request input.
 */

export const ASSISTANT_LIMITS = {
  /** Longest question accepted, in characters. */
  maxQuestionChars: 1_000,
  /** Earlier messages kept, newest last. Older ones are dropped. */
  maxHistoryMessages: 12,
  /** Longest earlier message kept, in characters. */
  maxHistoryMessageChars: 1_500,
  /** All earlier messages together, in characters. Oldest go first. */
  maxHistoryChars: 6_000,
  /** Rounds in which the model may ask for capabilities before it must answer. */
  maxCapabilityRounds: 3,
  /** Capability calls honoured in one round. */
  maxCallsPerRound: 3,
  /** Longest capability result handed to the model, in characters. */
  maxResultChars: 4_000,
  maxOutputTokens: 700,
} as const;

export type AssistantLimits = { readonly [Key in keyof typeof ASSISTANT_LIMITS]: number };

export type AssistantTurnInput = {
  readonly context: ActiveCompanyContext;
  /** The person's role as the app names it. Server-derived. */
  readonly roleLabel: string;
  /** Today in the company's time zone, in words. Server-derived. */
  readonly today: string;
  readonly question: string;
  /** Earlier messages as the browser sent them. Untrusted. */
  readonly history?: readonly AssistantHistoryMessage[];
  readonly model: AssistantModel;
  /** Every capability that exists. The engine keeps the ones allowed. */
  readonly capabilities: readonly AssistantCapability[];
  readonly now: Date;
  /** Tighter limits, for tests and server code. A limit can never be raised. */
  readonly limits?: Partial<AssistantLimits>;
};

/** Tool names may not contain a dot; capability ids do. */
export function capabilityToolName(capabilityId: string): string {
  return capabilityId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

const NOT_UNDERSTOOD =
  "I could not put an answer together for that. Try asking it another way, or open Help.";
const FIGURES_WITHHELD =
  "Here is what I found. The figures are shown below, straight from your records.";
const WENT_WRONG = "Something went wrong on our side. Try again in a moment.";

/** A limit may be tightened, never loosened, and never removed. */
function resolveLimits(overrides: Partial<AssistantLimits> | undefined): AssistantLimits {
  const limits: Record<string, number> = { ...ASSISTANT_LIMITS };
  for (const key of Object.keys(ASSISTANT_LIMITS) as (keyof AssistantLimits)[]) {
    const override = overrides?.[key];
    if (typeof override === "number" && Number.isFinite(override) && override >= 1) {
      limits[key] = Math.min(ASSISTANT_LIMITS[key], Math.floor(override));
    }
  }
  return limits as AssistantLimits;
}

/** A token count from a provider: a whole number, or nothing. */
function countOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** What went wrong, without what it said: messages can quote records. */
function errorKind(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

function isAllowed(capability: AssistantCapability, context: ActiveCompanyContext): boolean {
  try {
    return capability.kind === "read" && capability.allowed(context) === true;
  } catch {
    // A permission check that cannot be evaluated is a no.
    return false;
  }
}

/**
 * Earlier messages come back from the browser, so they are only ever words a
 * person or the assistant said: no tool results, no system text, bounded in
 * count and length. Authority never rides in on history; every capability
 * call in this turn is checked afresh.
 */
function acceptHistory(
  history: readonly AssistantHistoryMessage[] | undefined,
  limits: AssistantLimits,
): AssistantModelMessage[] {
  if (!Array.isArray(history)) return [];

  // History holds only what the person and the assistant said; tool results
  // are never carried between turns.
  const accepted: Extract<AssistantModelMessage, { role: "user" | "assistant" }>[] = [];
  for (const message of history) {
    if (!message || typeof message.text !== "string") continue;
    const text = message.text.trim().slice(0, limits.maxHistoryMessageChars);
    if (!text) continue;
    if (message.role === "user") {
      accepted.push({ role: "user", text });
    } else if (message.role === "assistant") {
      accepted.push({ role: "assistant", text, toolCalls: [] });
    }
  }

  const recent = accepted.slice(-limits.maxHistoryMessages);
  let total = recent.reduce((sum, message) => sum + message.text.length, 0);
  while (recent.length > 0 && total > limits.maxHistoryChars) {
    total -= recent.shift()!.text.length;
  }
  return recent;
}

export async function runAssistantTurn(input: AssistantTurnInput): Promise<AssistantTurnOutcome> {
  const limits = resolveLimits(input.limits);

  const blocks: AssistantBlock[] = [];
  const sources: AssistantSource[] = [];
  const figures: string[] = [];
  const capabilityIds: string[] = [];
  let deniedCalls = 0;
  let invalidCalls = 0;
  let modelCalls = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  const outcome = (
    status: AssistantTurnOutcome["status"],
    text: string,
    figuresWithheld = false,
  ): AssistantTurnOutcome => ({
    status,
    text,
    blocks: status === "answered" ? blocks : [],
    sources: status === "answered" ? sources : [],
    trace: { capabilityIds, deniedCalls, invalidCalls, modelCalls, figuresWithheld },
    usage: { inputTokens, outputTokens },
  });

  const question = typeof input.question === "string" ? input.question.trim() : "";
  if (!question) {
    return outcome("refused", "Type a question and I will look it up.");
  }
  if (question.length > limits.maxQuestionChars) {
    return outcome(
      "refused",
      `That is a long one. Ask it in ${limits.maxQuestionChars} characters or fewer.`,
    );
  }

  try {
    // The menu: readable, and allowed for this person. Decided once, before
    // the model has said anything, and never widened afterwards.
    const byToolName = new Map<string, AssistantCapability>();
    for (const capability of input.capabilities) {
      if (!isAllowed(capability, input.context)) continue;
      const toolName = capabilityToolName(capability.id);
      if (byToolName.has(toolName)) {
        // Two capabilities under one name would let the wrong one answer.
        console.error("[assistant] duplicate tool name, second one dropped:", { toolName });
        continue;
      }
      byToolName.set(toolName, capability);
    }
    const menu = [...byToolName.values()];
    const tools: AssistantModelTool[] = [...byToolName].map(([name, capability]) => ({
      name,
      description: capability.description,
      input: capability.input,
    }));

    const system = buildAssistantSystemPrompt({
      roleLabel: input.roleLabel,
      today: input.today,
      capabilities: menu,
    });

    const messages: AssistantModelMessage[] = [
      ...acceptHistory(input.history, limits),
      { role: "user", text: question },
    ];

    const marker = createDataMarker();
    let replyText: unknown = "";

    for (let round = 0; round <= limits.maxCapabilityRounds; round += 1) {
      // The closing round offers no tools, so the model has to answer in words.
      const closing = round === limits.maxCapabilityRounds;
      const response = await input.model.respond({
        system,
        messages,
        tools: closing ? [] : tools,
        maxOutputTokens: limits.maxOutputTokens,
      });
      modelCalls += 1;
      inputTokens += countOf(response?.usage?.inputTokens);
      outputTokens += countOf(response?.usage?.outputTokens);

      const toolCalls: readonly AssistantToolCall[] = Array.isArray(response?.toolCalls)
        ? response.toolCalls
        : [];

      if (closing || toolCalls.length === 0) {
        replyText = response?.text;
        break;
      }

      messages.push({
        role: "assistant",
        text: typeof response.text === "string" ? response.text : "",
        toolCalls,
      });

      for (const [index, call] of toolCalls.entries()) {
        const reply = (content: string) =>
          messages.push({
            role: "tool",
            callId: String(call?.callId ?? ""),
            toolName: String(call?.toolName ?? ""),
            content,
          });

        if (index >= limits.maxCallsPerRound) {
          deniedCalls += 1;
          reply("Not run: too many lookups at once. Ask for fewer.");
          continue;
        }

        const capability = byToolName.get(String(call?.toolName ?? ""));
        if (!capability) {
          deniedCalls += 1;
          reply("Not available: this person's sign-in does not have that ability.");
          continue;
        }

        const checked = validateCapabilityInput(capability.input, call.input);
        if (!checked.ok) {
          invalidCalls += 1;
          reply(`Not run: ${checked.problem}`);
          continue;
        }

        let result;
        try {
          result = await capability.run(input.context, checked.input, { now: input.now });
        } catch (error) {
          // Only the kind of error is logged. Its message can quote a record
          // or the request, and neither belongs in a log (rule 9).
          console.error("[assistant] capability failed:", {
            capability: capability.id,
            error: errorKind(error),
          });
          reply("That lookup did not work just now.");
          continue;
        }

        capabilityIds.push(capability.id);

        if (!result.ok) {
          reply(wrapCapabilityData(capability.title, String(result.message), marker));
          continue;
        }

        blocks.push(...result.blocks);
        sources.push(result.source);
        figures.push(...(result.figures ?? []));
        reply(
          wrapCapabilityData(
            capability.title,
            String(result.forModel).slice(0, limits.maxResultChars),
            marker,
          ),
        );
      }
    }

    const text = sanitizeModelText(replyText);

    // Rule 4. If the reply talks about money in any way but quoting a figure
    // a capability declared, the sentence is not shown. The app's own blocks
    // carry the figures that are real.
    if (hasUnsupportedMoney(text, figures)) {
      return outcome("answered", blocks.length > 0 ? FIGURES_WITHHELD : NOT_UNDERSTOOD, true);
    }

    if (!text) {
      return outcome("failed", NOT_UNDERSTOOD);
    }

    return outcome("answered", text);
  } catch (error) {
    console.error("[assistant] turn failed:", { error: errorKind(error) });
    return outcome("failed", WENT_WRONG);
  }
}
