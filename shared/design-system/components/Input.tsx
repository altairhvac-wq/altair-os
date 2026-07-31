"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { fieldControlClass } from "./field-styles";

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
 * Presentation classes live in `field-styles.ts` so compatibility surfaces
 * (admin-form-input, North Star form tokens) share the same contract.
 *
 * See docs/product/ALTAIR_DESIGN_FOUNDATION.md ("Forms" section) and
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
 *
 * `className` is additive layout only (width, grid placement, responsive
 * visibility, margin) — see the README's className extension policy. It is
 * not a supported way to override background, border, focus, radius, or
 * padding.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...props },
  ref,
) {
  return <input ref={ref} className={`${fieldControlClass} ${className}`} {...props} />;
});
