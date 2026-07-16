"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

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
 * See shared/design-system/components/README.md for the full contract.
 */
export type TextareaProps = ComponentPropsWithoutRef<"textarea">;

/**
 * Identical token usage to Input's `baseInputClass` — see Input.tsx for the
 * rationale behind each role. `resize-y` (vertical-only) is the default
 * because production textarea usage is a mix of `resize-none` and
 * `resize-y` today with no single dominant convention; vertical-only avoids
 * breaking a form's column layout while still letting a user expand a
 * field that needs more room. `min-h-24` gives a comfortable multi-line
 * starting height without a `rows` guess baked into the primitive.
 */
const baseTextareaClass = [
  "w-full min-h-24 resize-y rounded-xl border text-sm outline-none transition-colors",
  "bg-altair-paper-elevated text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted",
  "border-altair-border hover:border-altair-border-strong",
  "focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated",
  "aria-[invalid=true]:border-altair-danger-foreground aria-[invalid=true]:focus-visible:ring-altair-danger-foreground",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-altair-border disabled:bg-altair-paper-subtle disabled:text-altair-ink-muted disabled:opacity-70",
  "read-only:cursor-default read-only:bg-altair-stone read-only:hover:border-altair-border",
  "px-3.5 py-2.5",
].join(" ");

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className = "", ...props },
  ref,
) {
  return <textarea ref={ref} className={`${baseTextareaClass} ${className}`} {...props} />;
});
