import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";

/**
 * The assistant's vocabulary. See docs/product/ALTAIR_ASSISTANT.md for the
 * layers and the rules; this file is where they become types.
 *
 * Nothing here names a provider. The engine speaks these shapes, and one
 * adapter per provider translates them (rule 10).
 */

// ---------------------------------------------------------------- capability input

/**
 * The only input shapes a capability may ask for: a flat object of short
 * strings, whole numbers and booleans. Deliberately small. The same schema is
 * shown to the model and enforced by the server (`validateCapabilityInput`),
 * so what the model is told and what is accepted cannot drift apart.
 */
export type AssistantInputProperty =
  | {
      readonly type: "string";
      readonly description: string;
      readonly maxLength: number;
      readonly enum?: readonly string[];
    }
  | {
      readonly type: "integer";
      readonly description: string;
      readonly minimum: number;
      readonly maximum: number;
    }
  | { readonly type: "boolean"; readonly description: string };

export type AssistantInputSchema = {
  readonly type: "object";
  readonly properties: Readonly<Record<string, AssistantInputProperty>>;
  readonly required: readonly string[];
  readonly additionalProperties: false;
};

/** Input after validation: only declared keys, only declared types. */
export type AssistantInput = Readonly<Record<string, string | number | boolean>>;

// ---------------------------------------------------------------- capability output

/** Where an answer came from, shown to the person with every result (rule 4). */
export type AssistantSource = {
  /** Plain words: `Help: "Send an invoice"`, later "Your Invoices list". */
  readonly label: string;
  /** The signed-in page that shows the same thing, when there is one. */
  readonly href?: string;
  /** When the product read it, ISO 8601. */
  readonly readAt: string;
};

/**
 * Something the app draws itself from a capability's result. The model never
 * writes these; it only writes the sentence around them. New kinds are added
 * here as capabilities need them (tables of records, proposal cards).
 */
export type AssistantBlock =
  // Every string in a block is drawn as plain text. A block is never HTML.
  | {
      readonly kind: "help-note";
      readonly slug: string;
      readonly title: string;
      readonly summary: string;
      readonly steps: readonly string[];
      readonly goodToKnow: readonly string[];
      readonly startHref: string;
      readonly startLabel: string;
    }
  | {
      readonly kind: "help-note-list";
      readonly notes: readonly {
        readonly slug: string;
        readonly title: string;
        readonly summary: string;
      }[];
    };

export type AssistantCapabilityResult =
  | {
      readonly ok: true;
      /**
       * What the model is given: plain text, wrapped by the engine as data.
       * Built for the purpose, so nothing a role must not see is in it.
       */
      readonly forModel: string;
      readonly blocks: readonly AssistantBlock[];
      readonly source: AssistantSource;
      /**
       * The amounts of money this result established, exactly as the app
       * displays them ("$4,812.50"), taken from the result's own numeric
       * fields and never from free text in a record. The reply may quote
       * these and no other amount (rule 4). Omit when there are none.
       */
      readonly figures?: readonly string[];
    }
  | {
      readonly ok: false;
      /** Safe to show the person and the model. Never an internal detail. */
      readonly message: string;
    };

// ---------------------------------------------------------------- capability

export type AssistantRunEnvironment = {
  /** The moment of the request, injected so results are reproducible. */
  readonly now: Date;
};

export type AssistantCapability = {
  /**
   * Stable name, `area.action`, shaped like the public API's permission names
   * so one list can serve both: `help.search`, later `invoices.read`.
   */
  readonly id: string;
  /**
   * `read` returns information. `write` will return a proposal a person
   * confirms (rule 6); until that exists the engine runs no write capability.
   */
  readonly kind: "read" | "write";
  /** Plain name, shown to the person in "where this came from". */
  readonly title: string;
  /** For the model: when to use it and what it returns. */
  readonly description: string;
  readonly input: AssistantInputSchema;
  /**
   * Whether this person may use it. Built from the helpers in
   * lib/database/access-control.ts or the permission map, never from a role
   * name of its own. A capability that is not allowed is not offered to the
   * model and cannot be called.
   */
  allowed(context: ActiveCompanyContext): boolean;
  run(
    context: ActiveCompanyContext,
    input: AssistantInput,
    environment: AssistantRunEnvironment,
  ): Promise<AssistantCapabilityResult>;
};

// ---------------------------------------------------------------- the model, provider-neutral

export type AssistantToolCall = {
  /** The provider's id for this call, echoed back with its result. */
  readonly callId: string;
  /** The tool name the model used (see `capabilityToolName`). */
  readonly toolName: string;
  /** Whatever the model sent. Untrusted until validated. */
  readonly input: unknown;
};

export type AssistantModelMessage =
  | { readonly role: "user"; readonly text: string }
  | {
      readonly role: "assistant";
      readonly text: string;
      readonly toolCalls: readonly AssistantToolCall[];
    }
  | {
      readonly role: "tool";
      readonly callId: string;
      readonly toolName: string;
      readonly content: string;
    };

export type AssistantModelTool = {
  readonly name: string;
  readonly description: string;
  readonly input: AssistantInputSchema;
};

export type AssistantModelRequest = {
  readonly system: string;
  readonly messages: readonly AssistantModelMessage[];
  /** Empty on the closing request, which must be answered in words. */
  readonly tools: readonly AssistantModelTool[];
  readonly maxOutputTokens: number;
};

export type AssistantModelUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
};

export type AssistantModelResponse = {
  readonly text: string;
  readonly toolCalls: readonly AssistantToolCall[];
  readonly usage: AssistantModelUsage;
};

/** One provider behind one function. Adapters live in lib/assistant/providers. */
export type AssistantModel = {
  /** The model's name, for the usage ledger. */
  readonly id: string;
  respond(request: AssistantModelRequest): Promise<AssistantModelResponse>;
};

// ---------------------------------------------------------------- a turn

/** A past message as the browser holds it. Untrusted: the engine re-checks it. */
export type AssistantHistoryMessage = {
  readonly role: "user" | "assistant";
  readonly text: string;
};

export type AssistantTurnOutcome = {
  /**
   * `answered`: the model replied. `refused`: the question was not accepted
   * (empty, too long) and no model was called. `failed`: the model or the
   * engine could not produce an answer; `text` is a safe fallback.
   */
  readonly status: "answered" | "refused" | "failed";
  readonly text: string;
  readonly blocks: readonly AssistantBlock[];
  readonly sources: readonly AssistantSource[];
  /**
   * What happened, for the quiet log (rule 9): capability ids and counts,
   * never the question, the answer or record content.
   */
  readonly trace: {
    readonly capabilityIds: readonly string[];
    readonly deniedCalls: number;
    readonly invalidCalls: number;
    readonly modelCalls: number;
    readonly figuresWithheld: boolean;
  };
  readonly usage: AssistantModelUsage;
};
