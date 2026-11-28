import { hasInvisibleCharacters } from "@/lib/assistant/engine/characters";
import type { AssistantInput, AssistantInputSchema } from "@/lib/assistant/types";

/**
 * Checks what the model sent against a capability's schema. Strict: every
 * required key present, no key that was not declared, every value the declared
 * type and inside its bounds. Nothing is coerced, because a value the model
 * did not really send is a value nobody chose.
 */
export type CapabilityInputCheck =
  | { readonly ok: true; readonly input: AssistantInput }
  | { readonly ok: false; readonly problem: string };

export function validateCapabilityInput(
  schema: AssistantInputSchema,
  raw: unknown,
): CapabilityInputCheck {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, problem: "The input must be an object." };
  }

  const candidate = raw as Record<string, unknown>;
  const declared = Object.keys(schema.properties);

  for (const key of Object.keys(candidate)) {
    if (!declared.includes(key)) {
      return { ok: false, problem: "That is not an input of this ability." };
    }
  }

  const input: Record<string, string | number | boolean> = {};

  for (const key of declared) {
    const property = schema.properties[key];
    // Own keys only: a value inherited from a prototype was not sent.
    const value = Object.hasOwn(candidate, key) ? candidate[key] : undefined;

    if (value === undefined || value === null) {
      if (schema.required.includes(key)) {
        return { ok: false, problem: `"${key}" is required.` };
      }
      continue;
    }

    if (property.type === "string") {
      if (typeof value !== "string") {
        return { ok: false, problem: `"${key}" must be text.` };
      }
      if (hasInvisibleCharacters(value)) {
        return { ok: false, problem: `"${key}" has characters that are not allowed.` };
      }
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        if (schema.required.includes(key)) {
          return { ok: false, problem: `"${key}" is required.` };
        }
        // An empty optional value is the same as leaving it out.
        continue;
      }
      if (trimmed.length > property.maxLength) {
        return {
          ok: false,
          problem: `"${key}" is too long (${property.maxLength} characters at most).`,
        };
      }
      if (property.enum && !property.enum.includes(trimmed)) {
        return { ok: false, problem: `"${key}" must be one of: ${property.enum.join(", ")}.` };
      }
      input[key] = trimmed;
      continue;
    }

    if (property.type === "integer") {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        return { ok: false, problem: `"${key}" must be a whole number.` };
      }
      if (value < property.minimum || value > property.maximum) {
        return {
          ok: false,
          problem: `"${key}" must be between ${property.minimum} and ${property.maximum}.`,
        };
      }
      input[key] = value;
      continue;
    }

    if (typeof value !== "boolean") {
      return { ok: false, problem: `"${key}" must be true or false.` };
    }
    input[key] = value;
  }

  return { ok: true, input };
}
