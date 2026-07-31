"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { fieldTextareaClass } from "./field-styles";

/**
 * Canonical Altair native `<textarea>` primitive.
 *
 * Shares Input's visual and accessibility contract exactly (same tokens,
 * same focus/disabled/read-only/invalid presentation) so the two never look
 * unrelated in the same form. Owns sizing and resize behavior only. Never
 * owns a label, description, error message, generated id, or
 * `aria-describedby`/`aria-invalid` wiring — that composition belongs to
 * `Field`. No rich-text behavior and no built-in character counter.
 *
 * Presentation classes live in `field-styles.ts` so compatibility surfaces
 * share the same contract.
 *
 * See shared/design-system/components/README.md for the full contract.
 */
export type TextareaProps = ComponentPropsWithoutRef<"textarea">;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = "", ...props },
  ref,
) {
  return <textarea ref={ref} className={`${fieldTextareaClass} ${className}`} {...props} />;
});
