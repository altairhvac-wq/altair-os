export type AiFeatureName = string;

export type GenerateDraftTextRequest = {
  /** Logical feature name for auditing and future routing (e.g. "estimate-notes"). */
  feature: AiFeatureName;
  /** Instructions or context for the draft. */
  prompt: string;
  /** Optional source text the model should transform or expand. */
  inputText?: string;
  /** Reserved for future tenancy scoping — not used for persistence in V1. */
  companyId?: string;
  /** Reserved for future user scoping — not used for persistence in V1. */
  userId?: string;
};

export type GenerateDraftTextResult = {
  /** Plain draft text for human review only — never auto-applied. */
  draftText: string;
  model: string;
  feature: AiFeatureName;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
};

export type GenerateDraftTextErrorCode =
  | "ai_disabled"
  | "missing_api_key"
  | "provider_error"
  | "empty_response";

export type GenerateDraftTextError = {
  code: GenerateDraftTextErrorCode;
  message: string;
};

export type GenerateDraftTextOutcome =
  | { ok: true; result: GenerateDraftTextResult }
  | { ok: false; error: GenerateDraftTextError };
