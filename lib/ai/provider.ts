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

function sanitizeProviderError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    const status = error.status ?? "unknown";
    return `OpenAI request failed (status ${status}). Check server logs for details.`;
  }

  if (error instanceof Error && error.message) {
    return "AI provider request failed. Check server logs for details.";
  }

  return "AI provider request failed.";
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
        message:
          "AI features are disabled. Set AI_FEATURES_ENABLED=true to enable draft generation.",
      },
    };
  }

  if (!config.apiKey) {
    return {
      ok: false,
      error: {
        code: "missing_api_key",
        message:
          "OPENAI_API_KEY is not configured. Add it to server environment variables.",
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
          message: "OpenAI returned an empty draft.",
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
    return {
      ok: false,
      error: {
        code: "provider_error",
        message: sanitizeProviderError(error),
      },
    };
  }
}
