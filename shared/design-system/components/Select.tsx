"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { fieldSelectClass } from "./field-styles";

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
 * Presentation classes live in `field-styles.ts` so compatibility surfaces
 * share the same contract.
 *
 * See shared/design-system/components/README.md for the full contract.
 */
export type SelectProps = ComponentPropsWithoutRef<"select">;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = "", ...props },
  ref,
) {
  return <select ref={ref} className={`${fieldSelectClass} ${className}`} {...props} />;
});
