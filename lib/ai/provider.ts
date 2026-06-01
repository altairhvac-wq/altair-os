import "server-only";

import OpenAI from "openai";
import { getAiConfig } from "./env";
import type {
  GenerateDraftTextOutcome,
  GenerateDraftTextRequest,
  GenerateDraftTextResult,
} from "./types";

const DRAFT_SYSTEM_PROMPT =
  "You produce draft text only for human review. Output plain text. Do not claim to have taken any action, sent any message, or modified any record.";

function buildUserMessage(request: GenerateDraftTextRequest): string {
  const trimmedInput = request.inputText?.trim();

  if (trimmedInput) {
    return `${request.prompt.trim()}\n\n---\n\n${trimmedInput}`;
  }

  return request.prompt.trim();
}

function logProviderError(error: unknown): void {
  if (error instanceof OpenAI.APIError) {
    console.error("[generateDraftText] provider API error:", {
      status: error.status,
      type: error.type,
    });
    return;
  }

  if (error instanceof Error) {
    console.error("[generateDraftText] provider error:", error.message);
    return;
  }

  console.error("[generateDraftText] provider error: unknown");
}

/**
 * Generate draft text via OpenAI. Server-only; outputs are never auto-persisted.
 */
export async function generateDraftText(
  request: GenerateDraftTextRequest,
): Promise<GenerateDraftTextOutcome> {
  const config = getAiConfig();

  if (!config.enabled) {
    return {
      ok: false,
      error: {
        code: "ai_disabled",
        message: "AI features are disabled.",
      },
    };
  }

  if (!config.apiKey) {
    return {
      ok: false,
      error: {
        code: "missing_api_key",
        message: "AI API key is not configured.",
      },
    };
  }

  const prompt = request.prompt?.trim();
  if (!prompt) {
    return {
      ok: false,
      error: {
        code: "provider_error",
        message: "A non-empty prompt is required.",
      },
    };
  }

  try {
    const client = new OpenAI({ apiKey: config.apiKey });
    const response = await client.chat.completions.create({
      model: config.model,
      messages: [
        { role: "system", content: DRAFT_SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(request) },
      ],
    });

    const draftText = response.choices[0]?.message?.content?.trim() ?? "";

    if (!draftText) {
      return {
        ok: false,
        error: {
          code: "empty_response",
          message: "Provider returned an empty draft.",
        },
      };
    }

    const result: GenerateDraftTextResult = {
      draftText,
      model: config.model,
      feature: request.feature,
    };

    if (response.usage) {
      result.usage = {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
      };
    }

    return { ok: true, result };
  } catch (error) {
    logProviderError(error);
    return {
      ok: false,
      error: {
        code: "provider_error",
        message: "Provider request failed.",
      },
    };
  }
}
