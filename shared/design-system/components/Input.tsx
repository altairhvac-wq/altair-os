"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Canonical Altair native `<input>` primitive.
 *
 * Owns the shared visual treatment, semantic token usage, sizing, and the
 * focus/disabled/read-only/invalid presentation every text input in Altair
 * should share. Never owns a label, description, error message, generated
 * id, or `aria-describedby`/`aria-invalid` wiring — that composition belongs
 * to `Field`. Never owns business validation, normalization, or domain
 * wording.
 *
 * See docs/altair/ALTAIR_DESIGN_FOUNDATION.md ("Forms" section) and
 * shared/design-system/components/README.md for the full contract,
 * disabled-vs-read-only distinction, and className extension policy.
 */
export type InputProps = ComponentPropsWithoutRef<"input">;

/**
 * A global rule in app/globals.css already forces 1rem (16px) font-size on
 * every native input/select/textarea below the 768px breakpoint (iOS zoom
 * avoidance), so `text-sm` here is not overridden on mobile the way it would
 * be without that rule — see the "iOS Safari" comment above that rule.
 *
 * Invalid styling reacts to the native `aria-invalid` attribute Field sets,
 * rather than a bespoke `invalid` prop, so the control stays a plain native
 * element that responds to real ARIA state.
 */
const baseInputClass = [
  "w-full min-h-11 rounded-xl border text-sm outline-none transition-colors",
  "bg-altair-paper-elevated text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted",
  "border-altair-border hover:border-altair-border-strong",
  "focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated",
  "aria-[invalid=true]:border-altair-danger-foreground aria-[invalid=true]:focus-visible:ring-altair-danger-foreground",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-altair-border disabled:bg-altair-paper-subtle disabled:text-altair-ink-muted disabled:opacity-70",
  "read-only:cursor-default read-only:bg-altair-stone read-only:hover:border-altair-border",
  "px-3.5 py-2.5",
].join(" ");

/**
 * `className` is additive layout only (width, grid placement, responsive
 * visibility, margin) — see the README's className extension policy. It is
 * not a supported way to override background, border, focus, radius, or
 * padding.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...props },
  ref,
) {
  return <input ref={ref} className={`${baseInputClass} ${className}`} {...props} />;
});
