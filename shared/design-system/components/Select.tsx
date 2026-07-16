"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Canonical Altair native `<select>` primitive.
 *
 * Wraps a plain native `<select>` — native `<option>` children, native
 * value/defaultValue, native change events, native keyboard navigation, and
 * native form submission are all preserved untouched. Shares Input's visual
 * language (same tokens, same focus/disabled/invalid presentation) so a
 * Select sitting next to an Input or Button in a form row reads as the same
 * control family. Renders the browser's native dropdown affordance rather
 * than a decorative custom arrow — a custom select/combobox is explicitly
 * out of scope for this phase (see the Design Foundation audit).
 *
 * HTML has no `readOnly` attribute for `<select>` — only `disabled` exists
 * as an inert state here, unlike Input/Textarea which also support
 * `readOnly`.
 *
 * Never owns a label, description, error message, generated id, or
 * `aria-describedby`/`aria-invalid` wiring — that composition belongs to
 * `Field`. Never owns option data, domain wording, or business logic.
 *
 * See shared/design-system/components/README.md for the full contract.
 */
export type SelectProps = ComponentPropsWithoutRef<"select">;

const baseSelectClass = [
  "w-full min-h-11 rounded-xl border text-sm outline-none transition-colors",
  "bg-altair-paper-elevated text-altair-ink-on-paper",
  "border-altair-border hover:border-altair-border-strong",
  "focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated",
  "aria-[invalid=true]:border-altair-danger-foreground aria-[invalid=true]:focus-visible:ring-altair-danger-foreground",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-altair-border disabled:bg-altair-paper-subtle disabled:text-altair-ink-muted disabled:opacity-70",
  "px-3.5 py-2.5",
].join(" ");

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = "", ...props },
  ref,
) {
  return <select ref={ref} className={`${baseSelectClass} ${className}`} {...props} />;
});
